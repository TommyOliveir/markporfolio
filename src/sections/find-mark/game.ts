// The state of the walk, shared by the 3D scene and the page around it: where you are and which way
// you're facing, what the controls are doing, the camera's angle, the route you're following, and
// news for the page (you reached a landmark, you found Mark).

import { Ambience } from "./audio";
import type { FlyView } from "./balloon";
import type { RideKind, RideView } from "./ride";
import type { Obstacles, WalkGrid } from "./collide";
import { LOST_POSTCARDS, MARK, PANCIT, START, SUPERMART, type Landmark } from "./world";

/** Where "show me the way" can lead: to Mark, to Iloilo Supermart, or to the pancit stall (the errand). */
export type GuideTo = "mark" | "supermart" | "pancit";
const DESTINATIONS: Record<Exclude<GuideTo, "pancit">, { x: number; z: number }> = { mark: MARK, supermart: SUPERMART };

/**
 * The pancit errand, after the lost postcards: off until Mark asks, then fetching a bowl from Kap
 * Ising's, carrying it back to him while it's hot, and done once he has it.
 */
export type ErrandStage = "off" | "fetch" | "carry" | "done";

/**
 * The marching band by the convent: standing at ease beside the church, filing out to the street once
 * asked to play, marching up and down in front of the church, or heading back when told to stop.
 */
export type BandState = "rest" | "gathering" | "parade" | "returning";

export type GameEvent =
  | { type: "ready" }
  | { type: "found" }
  /** the intro swoop has landed behind you: the walk proper begins */
  | { type: "intro-done" }
  | { type: "landmark"; landmark: Landmark | null }
  | { type: "guide"; on: boolean; to: GuideTo }
  | { type: "route-failed" }
  /** the band changed what it's doing, or you came up to it (or walked off) */
  | { type: "band"; state: BandState; near: boolean }
  /** you picked up one of Mark's lost postcards */
  | { type: "postcard"; id: string; where: string; got: number; total: number }
  /** you brought all the lost postcards back to Mark (after already finding him) */
  | { type: "quest-done" }
  /** the pancit errand moved on (at "done": whether the soup was still hot) */
  | { type: "errand"; stage: ErrandStage; hot?: boolean }
  /** you got on a jeepney (view: where you're looking from), changed seat, or got off (null) */
  | { type: "ride"; view: RideView | null; kind?: RideKind }
  /** a jeepney on the plaza loop is (or is no longer) close enough to climb into */
  | { type: "can-board"; near: boolean; kind: RideKind | null }
  /** you're (or are no longer) close enough to climb into the hot-air balloon */
  | { type: "balloon"; near: boolean }
  /** you're up in the balloon (view: basket or outside), or back on the ground (null) */
  | { type: "flight"; view: FlyView | null }
  /** a line of news for the bottom of the screen ("End of the line") */
  | { type: "notice"; text: string };

export class Game {
  /**
   * A preview (the window onto Molo under "Find them in person"): the camera just circles the
   * plaza, nobody walks, and the route planner is never built.
   */
  readonly preview: boolean;

  constructor(opts: { preview?: boolean } = {}) {
    this.preview = !!opts.preview;
  }

  // you
  x = START.x;
  z = START.z;
  y = 0;
  vy = 0;
  heading = START.facing;
  speed = 0;
  grounded = true;

  // the camera orbits you: yaw 0 looks toward +z
  yaw = START.facing;
  pitch = 0.32;
  distance = 8.5;

  // controls
  readonly keys = new Set<string>();
  /** the on-screen joystick on phones: x right, y forward, each −1…1 */
  stick = { x: 0, y: 0 };
  /** a click or tap on the scene to walk to, in screen coordinates −1…1 */
  click: { x: number; y: number } | null = null;

  /** a route being walked automatically (to a clicked spot, or to Mark) */
  route: [number, number][] | null = null;
  /** true while "show me the way" is on: the trail to Mark stays drawn, even if you wander off it */
  guiding = false;
  /** where the trail leads while guiding */
  guideTo: GuideTo = "mark";
  /** the trail of glowing dots to Mark, kept up to date while guiding */
  trail: [number, number][] | null = null;
  /** where a click asked to go (for the ring on the ground) */
  target: { x: number; z: number } | null = null;

  started = false;
  /** you've found Mark (it only counts once) */
  found = false;
  /** the lost postcards you've picked up (ids from LOST_POSTCARDS), and whether you've brought them all to Mark */
  readonly collected = new Set<string>();
  questDone = false;
  /** Mark has asked you to find his lost postcards (after you found him): until then they're hidden */
  questStarted = false;
  /** when the quest's story card was closed (performance.now()), so the minimap can point out the postcards */
  questHint = 0;
  /** the pancit errand, how hot the bowl is (1 fresh from the pot, 0 cold), and when Mark asked */
  errand: ErrandStage = "off";
  heat = 1;
  errandHint = 0;
  /** where you pick up the bowl (the walk moves it in front of the stall once it's built) */
  pancit = { x: PANCIT.x, z: PANCIT.z };
  /** the middle of the stall's counter */
  pancitStall = { x: PANCIT.x, z: PANCIT.z };
  /** the controls are off while a card is up (the "found him" card) */
  paused = false;
  /** the visitor prefers less motion: no circling camera, no swoops */
  reducedMotion = false;
  /** set when the scene has a camera move it wants to make (the intro swoop, the found shot) */
  cinematic: "intro" | "found" | null = "intro";

  /** what the band is doing, whether you're close enough to talk to them, and what you asked */
  band: BandState = "rest";
  bandNear = false;
  bandRequest: "play" | "stop" | null = null;

  obstacles: Obstacles | null = null;
  walkGrid: WalkGrid | null = null;
  readonly audio = new Ambience();

  /** Little elements on the page the scene updates every frame without re-rendering React. */
  readonly hud: { distance?: HTMLElement | null; arrow?: HTMLElement | null; heat?: HTMLElement | null } = {};

  private listeners = new Set<(e: GameEvent) => void>();

  on(fn: (e: GameEvent) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  emit(e: GameEvent) {
    this.listeners.forEach((fn) => fn(e));
  }

  get distanceToMark() {
    return Math.hypot(MARK.x - this.x, MARK.z - this.z);
  }

  // ---- what the page tells the walk --------------------------------------------------------------

  /** The visitor pressed "Start walking". */
  begin(reducedMotion: boolean) {
    this.started = true;
    this.reducedMotion = reducedMotion;
    if (reducedMotion) this.cinematic = null;
  }

  /** riding a jeepney round the plaza loop: where you're looking from (null when you're on foot) */
  riding: RideView | null = null;
  /** what the page asked for, for the scene to carry out: climb on, or get off */
  rideRequest: "board" | "alight" | null = null;
  /** a loop jeepney is close enough to climb into */
  canBoard = false;

  /** up in the hot-air balloon: standing in the basket, or watching from outside (null on the ground) */
  flying: FlyView | null = null;
  /** what the page asked of the balloon: climb in, come down right here, or go back to its lawn */
  balloonRequest: "board" | "land" | "home" | null = null;
  /** close enough to the balloon to climb in */
  nearBalloon = false;

  /** "Ride the balloon", "Land here" or "Fly home". */
  requestBalloon(what: "board" | "land" | "home") {
    if (what === "board" ? this.nearBalloon && !this.flying && !this.riding : !!this.flying) this.balloonRequest = what;
  }

  /** Stand in the basket, or watch the balloon from outside. */
  setFlyView(view: FlyView) {
    if (!this.flying || this.flying === view) return;
    this.flying = view;
    this.emit({ type: "flight", view });
  }

  /** "Sakay!" or "Para po!": get on the nearest jeepney, or ask the one you're on to stop. */
  requestRide() {
    if (this.riding) this.rideRequest = "alight";
    else if (this.canBoard) this.rideRequest = "board";
  }

  /** Sit somewhere else on the jeepney: on the bench, up front, or watching from outside. */
  setRideView(view: RideView) {
    if (!this.riding || this.riding === view) return;
    this.riding = view;
    this.emit({ type: "ride", view });
  }

  /** The next view along (the V key): seats on a vehicle, or basket and outside in the balloon. */
  cycleRideView() {
    if (this.flying) {
      this.setFlyView(this.flying === "basket" ? "outside" : "basket");
      return;
    }
    const order: RideView[] = ["passenger", "front", "outside"];
    if (this.riding) this.setRideView(order[(order.indexOf(this.riding) + 1) % order.length]);
  }

  /** A card the page puts up (the quest's story) holds the walk until it's closed. */
  hold() {
    this.paused = true;
  }

  /** Mark has asked you to find his postcards: they appear, the minimap points them out, and you walk on. */
  startQuest() {
    this.questStarted = true;
    this.questHint = performance.now();
    this.resume();
  }

  /** Mark is hungry: the pancit stall lights up, the minimap points it out, and you walk on. */
  startErrand() {
    if (this.errand !== "off") return;
    this.setErrand("fetch");
    this.errandHint = performance.now();
    this.resume();
  }

  /**
   * Dev only (the "Test: pancit" button): skips the postcards quest, starts the errand, and puts you a
   * few metres in front of the stall, facing it. While you're carrying the bowl, it just takes you back.
   */
  testPancit() {
    this.found = true;
    this.questStarted = true;
    this.questDone = true;
    LOST_POSTCARDS.forEach((p) => this.collected.add(p.id));
    this.cinematic = null;
    this.route = null;
    this.target = null;
    if (this.guiding) this.guide(false);
    // stand back from the counter, out the way the stall faces
    const s = this.pancitStall;
    const dx = this.pancit.x - s.x;
    const dz = this.pancit.z - s.z;
    this.x = s.x + dx * 2.2;
    this.z = s.z + dz * 2.2;
    this.heading = Math.atan2(-dx, -dz);
    this.yaw = this.heading;
    this.pitch = 0.32;
    if (this.errand !== "carry") {
      this.errand = "off";
      this.heat = 1;
      this.startErrand();
    } else this.resume();
  }

  setErrand(stage: ErrandStage, hot?: boolean) {
    this.errand = stage;
    this.emit({ type: "errand", stage, hot });
  }

  /** Back to walking after the "found him" card. */
  resume() {
    this.paused = false;
    this.cinematic = null;
  }

  /** Dragging to look round: turn and tilt the camera. Below 0 you look up, at the sky and the spires. */
  look(dx: number, dy: number) {
    this.yaw -= dx;
    this.pitch = Math.min(Math.max(this.pitch + dy, -0.9), 1.3);
  }

  /** Wheel or pinch: `factor` > 1 pulls the camera back. */
  zoom(factor: number) {
    this.distance = Math.min(Math.max(this.distance * factor, 3.5), 22);
  }

  setStick(x: number, y: number) {
    this.stick = { x, y };
  }

  /** A click or tap on the scene, in screen coordinates −1…1. */
  clickAt(x: number, y: number) {
    this.click = { x, y };
  }

  attachHud(key: "distance" | "arrow" | "heat", el: HTMLElement | null) {
    this.hud[key] = el;
  }

  attachWorld(obstacles: Obstacles | null) {
    this.obstacles = obstacles;
    if (!obstacles) this.walkGrid = null;
  }

  setWalkGrid(grid: WalkGrid) {
    this.walkGrid = grid;
  }

  /** Finds the way to a spot and starts walking it. */
  walkTo(x: number, z: number, guide = false) {
    if (!this.walkGrid) return false;
    const path = this.walkGrid.find(this.x, this.z, x, z);
    if (!path) {
      this.emit({ type: "route-failed" });
      return false;
    }
    this.route = path.slice(1);
    this.target = guide ? null : { x: path[path.length - 1][0], z: path[path.length - 1][1] };
    return true;
  }

  /** where the trail leads while guiding */
  get destination() {
    return this.guideTo === "pancit" ? this.pancit : DESTINATIONS[this.guideTo];
  }

  /** Asks the band to strike up and march (or to stop and go back). */
  askBand(play: boolean) {
    this.bandRequest = play ? "play" : "stop";
  }

  /** "Show me the way": draws the trail to Mark (or to Iloilo Supermart) and walks it. */
  guide(on = true, to: GuideTo = "mark") {
    this.guiding = on;
    if (on) this.guideTo = to;
    if (on) {
      const { x, z } = this.destination;
      if (this.walkTo(x, z, true)) this.trail = [[this.x, this.z], ...this.route!];
      else this.guiding = false;
    } else {
      this.route = null;
      this.trail = null;
    }
    this.emit({ type: "guide", on: this.guiding, to: this.guideTo });
  }

  /** Re-plans the trail from wherever you are now (while guiding). */
  refreshTrail() {
    if (!this.guiding || !this.walkGrid) return;
    const { x, z } = this.destination;
    const path = this.walkGrid.find(this.x, this.z, x, z);
    if (path) this.trail = path;
  }

  /** Taking the controls back stops any automatic walking (but leaves the trail to Mark drawn). */
  takeControl() {
    if (this.route) {
      this.route = null;
      this.target = null;
    }
  }

  dispose() {
    this.audio.dispose();
    this.listeners.clear();
  }
}
