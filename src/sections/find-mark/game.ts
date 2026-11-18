// The state of the walk, shared by the 3D scene and the page around it: where you are and which way
// you're facing, what the controls are doing, the camera's angle, the route you're following, and
// news for the page (you reached a landmark, you found Mark).

import { Ambience } from "./audio";
import type { Obstacles, WalkGrid } from "./collide";
import { MARK, START, SUPERMART, type Landmark } from "./world";

/** Where "show me the way" can lead: to Mark, or to Iloilo Supermart. */
export type GuideTo = "mark" | "supermart";
const DESTINATIONS: Record<GuideTo, { x: number; z: number }> = { mark: MARK, supermart: SUPERMART };

export type GameEvent =
  | { type: "ready" }
  | { type: "found" }
  | { type: "landmark"; landmark: Landmark | null }
  | { type: "guide"; on: boolean; to: GuideTo }
  | { type: "route-failed" };

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
  /** the controls are off while a card is up (the "found him" card) */
  paused = false;
  /** the visitor prefers less motion: no circling camera, no swoops */
  reducedMotion = false;
  /** set when the scene has a camera move it wants to make (the intro swoop, the found shot) */
  cinematic: "intro" | "found" | null = "intro";

  obstacles: Obstacles | null = null;
  walkGrid: WalkGrid | null = null;
  readonly audio = new Ambience();

  /** Little elements on the page the scene updates every frame without re-rendering React. */
  readonly hud: { distance?: HTMLElement | null; arrow?: HTMLElement | null } = {};

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

  /** Back to walking after the "found him" card. */
  resume() {
    this.paused = false;
    this.cinematic = null;
  }

  /** Dragging to look round: turn and tilt the camera. */
  look(dx: number, dy: number) {
    this.yaw -= dx;
    this.pitch = Math.min(Math.max(this.pitch + dy, 0.04), 1.3);
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

  attachHud(key: "distance" | "arrow", el: HTMLElement | null) {
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
    return DESTINATIONS[this.guideTo];
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
