// The walk, frame by frame: builds the stage (the map, traffic, crowd, you and Mark), then on every
// frame reads the controls, moves you (walking, running, jumping, climbing steps, bumping into things),
// moves the camera (following you, keeping out of walls, the intro swoop and the "found him" shot),
// and brings the rest of Molo along — jeepneys, people, pigeons, the trail to Mark and the sounds.
// The people start out painted; the realistic ones (humans.ts) take their places once they've loaded.

import {
  Fog,
  Frustum,
  Group,
  Matrix4,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
  type Camera,
  type DirectionalLight,
  type Material,
  type Object3D,
} from "three";
import { seeded } from "@/lib/seeded";
import { buildWorld } from "./build-world";
import { LostPostcards } from "./quest";
import { PancitErrand } from "./errand";
import { SongQuest } from "./song";
import type { Circle } from "./collide";
import { Confetti, Trail, buildClickRing, buildFlag, buildSigns, buildWaters } from "./effects";
import type { Game } from "./game";
import { loadFonts } from "./labels";
import { Band } from "./band";
import { Boy } from "./boy";
import { loadHumans, type Humans } from "./humans";
import { Life } from "./life";
import { Person, crowdLook } from "./people";
import { buildMarkCorner } from "./mark";
import { seeThrough, time } from "./materials";
import { SUN, buildClouds, buildSky } from "./sky";
import { BalloonFlight, PARKED_RADIUS, balloonCamera } from "./balloon";
import { SEATS, buildCabin, emptyCabin, seatCamera, type Seat } from "./ride";
import type { View } from "./rig";
import { Traffic, type Vehicle } from "./traffic";
import { loadVehicles, type Vehicles } from "./vehicles";
import { ceilingLocal, insideLocal, PLAN, PRAYER_SEATS } from "./church-interior";
import {
  BALLOON,
  CHURCH,
  DANDANSOY,
  ERRAND_TIME,
  FOUND_RADIUS,
  LOST_POSTCARDS,
  MANSION,
  MARK,
  WORLD_RADIUS,
  churchInside,
  landmarks,
  toLocal,
  toWorld,
  type Landmark,
} from "./world";

const WALK = 4.2;
const RUN = 9.5;
const AUTO = 5.2;
const RADIUS = 0.35;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const angleTo = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export class Walk {
  readonly root = new Group();
  readonly sky = buildSky();
  private world;
  private clouds = buildClouds();
  private traffic: Traffic;
  private life: Life;
  private band: Band;
  private player: Boy;
  private corner: ReturnType<typeof buildMarkCorner>;
  private waters: ReturnType<typeof buildWaters>;
  private poolWater: ReturnType<typeof buildWaters>;
  private flag: ReturnType<typeof buildFlag> | null;
  private signs: ReturnType<typeof buildSigns> | null = null;
  private trail = new Trail();
  private ring = buildClickRing();
  private confetti: Confetti;
  private lostPostcards: LostPostcards;
  private errand: PancitErrand;
  private songQuest = new SongQuest();
  /** the "it's getting cold" warning has been given for this bowl */
  private coldWarned = false;
  private gridTimer = 0;
  private alive = true;

  // per-frame bookkeeping
  private extras: Circle[] = [];
  private stepDist = 0;
  private landmark: Landmark | null = null;
  /** the jeepney, tricycle or car you're riding: its cabin, and where your look started from */
  private ride: {
    vehicle: Vehicle;
    cabin: ReturnType<typeof buildCabin>;
    /** a realistic vehicle's own seats for each view (otherwise the painted cabin's, from ride.ts) */
    seats: Record<"passenger" | "front", Seat> | null;
    view: string | null;
    yaw0: number;
    pitch0: number;
  } | null = null;
  /** the hot-air balloon on the churchyard lawn, and your flight in it (where your look started from) */
  private balloon: BalloonFlight;
  private flight: { view: string | null; yaw0: number; pitch0: number } | null = null;
  /** the kind of vehicle you could climb into right now (null: none close enough) */
  private nearKind: Vehicle["kind"] | null = null;
  /** you're in the nave of St. Anne's (the bells ring each time you come in) */
  private inChurch = false;
  private trailClock = 0;
  private trailFrom = { x: 0, z: 0 };
  private camDist = 8.5;
  private blend = 0;
  private readySent = false;
  private raycaster = new Raycaster();
  private tmp = new Vector3();
  private look = new Vector3();
  private follow = new Vector3();
  private velocity = { x: 0, z: 0 };
  private jumpHeld = false;
  // the realistic people: who to bring up to date each frame, and what they need to know
  private figures: { tick: (dt: number, view: View) => void }[] = [];
  private view: View;
  private projection = new Matrix4();
  private peopleReady = false;
  private vehiclesReady = false;
  // the driver and passengers sitting in the realistic jeepneys
  private jeepneyRiders: Person[] = [];
  // kept for the people who turn up later (the riders in a vehicle you board)
  private humans: Humans | null = null;
  private extrasRand = seeded(1901);
  private born = performance.now();

  constructor(
    private game: Game,
    lite: boolean,
  ) {
    const world = buildWorld(lite);
    this.world = world;
    this.view = { frustum: new Frustum(), camera: new Vector3(), player: new Vector3(), frame: 0, budget: 0, lite };
    const painted = world.painted as Material;
    this.traffic = new Traffic(painted, lite);
    this.traffic.onHorn = () => game.audio.horn();
    // a guard just inside the gate, looking out at the street
    const [gx, gz] = toWorld(MANSION, 1.7 - 3.3, 31.2);
    this.life = new Life(painted, world.obstacles, {
      lite,
      fountain: world.props.fountain,
      cart: { x: world.props.fountain.x + 7.5, z: world.props.fountain.z + 5 },
      balloons: world.props.balloonSpot,
      gate: { x: gx, z: gz, facing: MANSION.angle },
      diners: world.props.diners,
      worship: { seats: PRAYER_SEATS, material: world.churchInside.material as Material },
    });
    world.churchInside.add(this.life.worshippers); // shown and hidden with the interior
    this.band = new Band(painted);
    this.player = new Boy(painted);
    this.corner = buildMarkCorner(painted);
    world.obstacles.addCircle(MARK.x, MARK.z, 0.4, 2, false);
    for (const [lx, lz, r] of [
      [-1.3, 1.6, 0.75],
      [-2.5, 0.9, 0.35],
      [2.2, 1.0, 0.45],
    ]) {
      const [x, z] = toWorld(MANSION, lx, lz);
      world.obstacles.addCircle(x, z, r, 2, false);
    }
    this.waters = buildWaters(world.props.waters, world.props.falls, world.props.jets);
    this.poolWater = buildWaters(
      [{ x: world.pool.x, y: 0.47, z: world.pool.z, r: 2.6 }],
      [{ x: world.pool.x, z: world.pool.z, y: 0.5, h: 0.4, rTop: 0.9, rBottom: 1.0 }],
      [],
    );
    const f = world.props.flag;
    this.flag = f ? buildFlag(f.x, f.z, f.top) : null;
    this.confetti = new Confetti(lite ? 120 : 200);
    this.balloon = new BalloonFlight(painted, (x, z) => world.terrain.heightAt(x, z));
    this.lostPostcards = new LostPostcards((x, z) => world.terrain.heightAt(x, z));
    this.errand = new PancitErrand(
      painted,
      (x, z) => world.terrain.heightAt(x, z),
      world.props.signPlacements.find((s) => s.name === "Kap Ising's Pancit Molo"),
      world.obstacles,
    );
    game.pancit = this.errand.spot;
    game.pancitStall = this.errand.stall;

    this.root.add(
      world.root,
      this.clouds,
      this.traffic.group,
      this.life.group,
      this.band.group,
      this.player.root,
      this.corner.group,
      this.corner.beacon,
      this.waters.group,
      this.poolWater.group,
      this.trail.mesh,
      this.ring,
      this.confetti.mesh,
    );
    if (this.flag) this.root.add(this.flag.mesh);
    if (!game.preview) this.root.add(this.lostPostcards.group);
    this.root.add(this.errand.group); // the stall is there all along; the errand only lights it up
    if (!game.preview) this.root.add(this.songQuest.group);
    this.root.add(this.balloon.group);

    game.attachWorld(world.obstacles);
    // the route planner's grid takes a moment; build it once the first frames are on screen
    if (!game.preview) this.gridTimer = window.setTimeout(() => game.setWalkGrid(world.walkGrid()), 400);
    // the realistic people; until they're here (or if they can't load) the painted ones stand in
    loadHumans(lite)
      .then((humans) => this.alive && this.dress(humans))
      .catch((e) => console.warn("The realistic people didn't load; showing the painted ones.", e))
      .finally(() => (this.peopleReady = true));
    // and the realistic cars and jeepneys, with people in the jeepneys
    loadVehicles(lite)
      .then((vehicles) => this.alive && this.fitVehicles(vehicles, lite))
      .catch((e) => console.warn("The realistic vehicles didn't load; showing the painted ones.", e))
      .finally(() => (this.vehiclesReady = true));
    loadFonts().then(() => {
      if (!this.alive) return;
      this.signs = buildSigns(world.props.signPlacements, world.props.welcomeSign);
      this.root.add(this.signs.group);
      this.corner.repaint();
      if (!game.preview) this.lostPostcards.build();
    });
  }

  frame(t: number, rawDt: number, camera: Camera, sun: DirectionalLight | null) {
    const dt = Math.min(rawDt, 1 / 20);
    time.value = t;
    const game = this.game;
    const { world, traffic, life, player, corner, trail, ring, confetti } = this;
    // trees between the camera and the walker thin out so you can always see him
    const inSeat = (!!this.ride && game.riding !== "outside") || game.flying === "basket";
    seeThrough.on.value = game.started && !inSeat && !this.flight ? 1 : 0;
    seeThrough.target.value.set(game.x, game.y + 1.1, game.z);

    // ready once the people are dressed (so they don't change in front of you), or after a few seconds
    if (!this.readySent && ((this.peopleReady && this.vehiclesReady) || performance.now() - this.born > 6000)) {
      this.readySent = true;
      game.emit({ type: "ready" });
    }

    // ---- a click on the scene: walk there -----------------------------------------------------
    if (game.click && game.started && !game.paused && !this.ride && !this.flight) {
      this.raycaster.setFromCamera(new Vector2(game.click.x, game.click.y), camera);
      // (hidden meshes still get hit by a ray, so skip them: inside the church, the outside is hidden)
      const shown = (o: Object3D | null): boolean => !o || (o.visible && shown(o.parent));
      const hit = this.raycaster.intersectObjects(world.clickable, false).find((h) => shown(h.object));
      if (hit) game.walkTo(hit.point.x, hit.point.z);
    }
    game.click = null;

    // ---- the traffic (first, so a vehicle you're riding is where it is this frame) -------------------
    // while the band is out, its stretch of Jocson Street is closed to traffic; the band files out once
    // the cars already on it have driven off
    const closed = this.band.zone();
    traffic.update(dt, game, this.band.onStreet(), closed);
    this.band.streetClear = !closed || traffic.clearOf(closed);

    // ---- you ----------------------------------------------------------------------------------
    const k = game.keys;
    const playing = game.started && !game.paused;

    // ---- riding: get on, ask to stop ("Para po!"), get off once it has stopped ----------------------
    if (game.rideRequest === "board" && !this.ride && playing) {
      const v = traffic.boardable(game.x, game.z);
      if (v) this.board(v);
    }
    if (game.rideRequest === "alight" && this.ride && !traffic.stopRequested) {
      traffic.stopRequested = true;
      game.audio.coinTaps();
    }
    game.rideRequest = null;
    if (this.ride) {
      const v = this.ride.vehicle;
      // a car or tricycle on a one-way run stops at the end of its street: everybody off
      if (!v.route.loop && v.s > v.route.length - 12 && !traffic.stopRequested) {
        traffic.stopRequested = true;
        game.emit({ type: "notice", text: "End of the line — everybody off!" });
      }
      if (traffic.stopRequested && v.speed < 0.2) this.alight();
    }
    // a vehicle close enough to climb into (it stops for you when you stand in its way)
    const hop = playing && !this.ride ? traffic.boardable(game.x, game.z) : null;
    const hopKind = hop?.kind ?? null;
    if (hopKind !== this.nearKind) {
      this.nearKind = hopKind;
      game.canBoard = !!hop;
      game.emit({ type: "can-board", near: !!hop, kind: hopKind });
    }

    // ---- the hot-air balloon: climb in, "Land here" (over the nearest open ground), "Back" ----------
    const balloon = this.balloon;
    if (game.balloonRequest === "board" && playing && !this.flight && !this.ride && balloon.emptyAtHome) this.takeOff();
    if (game.balloonRequest === "land" && this.flight) {
      const b = balloon.position;
      balloon.landAt(game.walkGrid?.openGround(b.x, b.z, 4.5) ?? [BALLOON.x, BALLOON.z]);
    }
    if (game.balloonRequest === "home" && this.flight) balloon.flyHome();
    game.balloonRequest = null;
    balloon.update(dt, t, game.reducedMotion);
    if (balloon.burst && (this.flight || Math.hypot(balloon.position.x - game.x, balloon.position.z - game.z) < 40))
      game.audio.burner();
    balloon.settle();
    if (this.flight && balloon.touchedDown) this.stepOut();
    const byBalloon =
      playing &&
      !this.flight &&
      !this.ride &&
      balloon.emptyAtHome &&
      Math.hypot(game.x - BALLOON.x, game.z - BALLOON.z) < PARKED_RADIUS + 2.2;
    if (byBalloon !== game.nearBalloon) {
      game.nearBalloon = byBalloon;
      game.emit({ type: "balloon", near: byBalloon });
    }
    let ix =
      (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0) + game.stick.x;
    let iy = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) + game.stick.y;
    if (!playing) ix = iy = 0;
    const steering = Math.hypot(ix, iy) > 0.15;
    if (steering) game.takeControl();

    const fx = Math.sin(game.yaw);
    const fz = Math.cos(game.yaw);
    let wantX = 0;
    let wantZ = 0;
    let speed = 0;
    if (steering) {
      const len = Math.hypot(ix, iy);
      const nx = ix / len;
      const ny = iy / len;
      // forward is where the camera looks; right is the camera's right
      wantX = fx * ny - fz * nx;
      wantZ = fz * ny + fx * nx;
      const run = k.has("ShiftLeft") || k.has("ShiftRight") || Math.hypot(game.stick.x, game.stick.y) > 0.92;
      speed = (run ? RUN : WALK) * Math.min(len, 1);
    } else if (playing && game.route?.length) {
      const [tx, tz] = game.route[0];
      const dx = tx - game.x;
      const dz = tz - game.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.7) {
        game.route.shift();
        if (!game.route.length) {
          game.route = null;
          game.target = null;
        }
      } else {
        wantX = dx / d;
        wantZ = dz / d;
        speed = AUTO;
      }
    }
    if (this.flight) {
      // up in the balloon: you go where it goes (the minimap, landmark cards and music follow along)
      game.x = balloon.position.x;
      game.z = balloon.position.z;
      game.y = 0;
      game.speed = 0;
      game.heading = balloon.facing;
      game.route = null;
      game.target = null;
    } else if (this.ride) {
      // aboard: you go where the vehicle goes (so the minimap, landmark cards and music follow along)
      const o = this.ride.vehicle.object;
      game.x = o.position.x;
      game.z = o.position.z;
      game.y = 0;
      game.speed = 0;
      game.heading = this.ride.vehicle.heading;
      game.route = null;
      game.target = null;
      this.ride.cabin.update(t, this.ride.vehicle.speed);
      game.audio.engine(Math.min(1, 0.35 + this.ride.vehicle.speed / 7));
    } else {
      const accel = Math.min(dt * 10, 1);
      this.velocity.x += (wantX * speed - this.velocity.x) * accel;
      this.velocity.z += (wantZ * speed - this.velocity.z) * accel;

      const bx = game.x;
      const bz = game.z;
      const p = { x: game.x + this.velocity.x * dt, z: game.z + this.velocity.z * dt };
      const r = Math.hypot(p.x, p.z);
      if (r > WORLD_RADIUS) {
        p.x *= WORLD_RADIUS / r;
        p.z *= WORLD_RADIUS / r;
      }
      const extras = traffic.colliders(this.extras);
      extras.push(...life.people(), ...this.band.colliders());
      if (balloon.emptyAtHome) extras.push({ x: BALLOON.x, z: BALLOON.z, r: PARKED_RADIUS, h: 3 });
      world.obstacles.resolve(p, RADIUS, extras);
      game.x = p.x;
      game.z = p.z;
      const moved = Math.hypot(game.x - bx, game.z - bz);
      game.speed = dt > 0 ? moved / dt : 0;
      if (game.speed > 0.3 && Math.hypot(this.velocity.x, this.velocity.z) > 0.3)
        game.heading += angleTo(game.heading, Math.atan2(this.velocity.x, this.velocity.z)) * Math.min(dt * 12, 1);

      // jumping, stairs and steps
      const floor = world.terrain.heightAt(game.x, game.z);
      const jump = playing && k.has("Space");
      if (jump && !this.jumpHeld && game.grounded) {
        game.vy = 5.8;
        game.grounded = false;
      }
      this.jumpHeld = jump;
      if (!game.grounded) {
        game.vy -= 17 * dt;
        game.y += game.vy * dt;
        if (game.y <= floor) {
          game.y = floor;
          game.vy = 0;
          game.grounded = true;
          game.audio.step(true);
        }
      } else {
        game.y += (floor - game.y) * Math.min(dt * 14, 1);
      }

      if (game.grounded && game.speed > 0.5) {
        this.stepDist += moved;
        if (this.stepDist > (game.speed > 6 ? 1.15 : 0.8)) {
          this.stepDist = 0;
          game.audio.step(game.speed > 6);
        }
      }
    }

    player.root.visible = !this.ride && game.flying !== "basket";
    player.root.position.set(game.x, game.y, game.z);
    if (this.flight) player.root.position.copy(balloon.position).setY(balloon.position.y + 0.1); // in the basket
    player.root.rotation.y = game.heading;
    player.animate(dt, game.speed, t, !game.grounded);

    // ---- Mark -----------------------------------------------------------------------------------
    const toMark = game.distanceToMark;
    corner.update(t, game.found, toMark, Math.atan2(game.x - MARK.x, game.z - MARK.z));
    const atMark = toMark < FOUND_RADIUS && game.y > 0.6;
    const allPostcards = game.collected.size === LOST_POSTCARDS.length;
    // back at Mark with every lost postcard, after already finding him: the quest's own ending
    if (playing && game.found && !game.questDone && allPostcards && atMark) {
      game.questDone = true;
      game.paused = true;
      game.route = null;
      confetti.burst(MARK.x, MARK.y + 2.2, MARK.z);
      game.audio.found();
      game.emit({ type: "quest-done" });
    }
    // back at Mark with the pancit: he takes it, still hot (or not quite)
    if (playing && game.errand === "carry" && atMark) {
      game.paused = true;
      game.route = null;
      game.target = null;
      if (game.guiding) game.guide(false);
      player.carry(null);
      confetti.burst(MARK.x, MARK.y + 2.2, MARK.z);
      game.audio.found();
      game.setErrand("done", game.heat >= 0.35);
    }
    if (playing && !game.found && atMark) {
      game.found = true;
      game.paused = true;
      game.route = null;
      game.target = null;
      game.guiding = false;
      game.trail = null;
      game.emit({ type: "guide", on: false, to: game.guideTo });
      game.cinematic = "found";
      this.blend = 0;
      confetti.burst(MARK.x, MARK.y + 2.2, MARK.z);
      game.audio.found();
      game.emit({ type: "found" });
    }

    // ---- Mark's lost postcards ------------------------------------------------------------------------
    if (!game.preview) {
      const picked = this.lostPostcards.update(t, dt, game, playing && !this.ride && !this.flight);
      if (picked) {
        game.audio.pickup();
        confetti.burst(picked.x, this.world.terrain.heightAt(picked.x, picked.z) + 1.4, picked.z);
        game.emit({
          type: "postcard",
          id: picked.id,
          where: picked.where,
          got: game.collected.size,
          total: LOST_POSTCARDS.length,
        });
      }
    }

    // ---- the pancit errand: take the bowl at Kap Ising's; it cools on the way ------------------------
    // (slower in a covered vehicle, faster in the wind up in the balloon)
    const cooling = (this.flight ? 2 : this.ride ? 0.5 : 1) / ERRAND_TIME;
    if (this.errand.update(t, dt, game, playing && !this.ride && !this.flight, cooling)) {
      game.heat = 1;
      this.coldWarned = false;
      if (game.guiding && game.guideTo === "pancit") game.guide(false);
      player.carry(this.errand.held);
      game.audio.pickup();
      game.setErrand("carry");
    }
    if (game.errand === "carry" && game.heat < 0.3 && !this.coldWarned) {
      this.coldWarned = true;
      game.emit({ type: "notice", text: "The pancit's getting cold — hurry!" });
    }

    // ---- the camera -----------------------------------------------------------------------------
    // a wider view, from a little further back, on a phone held upright
    const upright = camera instanceof PerspectiveCamera && camera.aspect < 0.9;
    if (camera instanceof PerspectiveCamera) {
      const fov = inSeat ? (upright ? 80 : 68) : upright ? 64 : 50;
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
    const target = this.look.set(game.x, game.y + 1.45, game.z);
    if (game.route && !steering) game.yaw += angleTo(game.yaw, game.heading) * Math.min(dt * 1.4, 1);
    // the camera orbits no lower than about head height; tilting further (pitch < 0) turns it to look up
    const camPitch = Math.max(game.pitch, -0.3);
    const cp = Math.cos(camPitch);
    const ox = -Math.sin(game.yaw) * cp;
    const oy = Math.sin(camPitch);
    const oz = -Math.cos(game.yaw) * cp;
    const want = game.distance * (upright ? 1.25 : 1);
    const hit = world.obstacles.firstHit(
      target.x,
      target.y,
      target.z,
      target.x + ox * want,
      target.y + oy * want,
      target.z + oz * want,
    );
    // pulled in front of a wall, but never closer than over your shoulder; inside the church, where the
    // walls, columns and pews are close, it may come right in (or it would end up inside a wall)
    const [inX, inZ] = toLocal(CHURCH, game.x, game.z);
    const closest = insideLocal(inX, inZ) ? 0.6 : 1.6;
    const allowed = hit < 1 ? Math.max(want * hit - 0.4, closest) : want;
    this.camDist += (allowed - this.camDist) * Math.min(dt * (allowed < this.camDist ? 14 : 3), 1);
    const follow = this.follow.set(
      target.x + ox * this.camDist,
      target.y + oy * this.camDist,
      target.z + oz * this.camDist,
    );
    follow.y = Math.max(follow.y, world.terrain.heightAt(follow.x, follow.z) + 0.4);
    // inside the church, keep the camera under the ceiling
    const [clx, clz] = toLocal(CHURCH, follow.x, follow.z);
    if (insideLocal(clx, clz)) follow.y = Math.min(follow.y, ceilingLocal(clx, clz) - 0.5);

    if (game.cinematic === "intro") {
      // a slow circle high over the plaza while the intro card is up, then a swoop down to you
      // (the preview window flies a little lower and closer, so the church and mansion fill the frame)
      const a = (game.reducedMotion ? 0 : t * (game.preview ? 0.06 : 0.045)) + 0.6;
      const r = game.preview ? 98 : 125;
      const high = new Vector3(-20 + Math.cos(a) * r, game.preview ? 56 : 78, 5 + Math.sin(a) * r);
      const centre = new Vector3(-16, 0, 6);
      if (!game.started) {
        camera.position.copy(high);
        camera.lookAt(centre);
      } else {
        this.blend = Math.min(this.blend + dt / 2.6, 1);
        const b = ease(this.blend);
        camera.position.lerpVectors(high, follow, b);
        camera.lookAt(this.tmp.lerpVectors(centre, target, b));
        if (this.blend >= 1) {
          game.cinematic = null;
          game.emit({ type: "intro-done" });
        }
      }
    } else if (game.cinematic === "found") {
      // swing round to look at Mark and you together
      this.blend = Math.min(this.blend + dt / 1.8, 1);
      const b = ease(this.blend);
      const [sx, sz] = toWorld(MANSION, -3.2, 9.5);
      const shot = new Vector3(sx, MARK.y + 3.4, sz);
      const lookAt = new Vector3((MARK.x + game.x) / 2, MARK.y + 1.1, (MARK.z + game.z) / 2);
      // keep Mark clear of the "found him" card: on an upright screen the card is across the top, so aim
      // higher and he sits low in the frame; on a wide one it's in the top-left corner, so aim a little to
      // the left and he sits right of centre
      if (upright) lookAt.y += 1.9;
      else {
        const dx = lookAt.x - shot.x;
        const dz = lookAt.z - shot.z;
        const d = Math.hypot(dx, dz) || 1;
        lookAt.x += (dz / d) * 1.5;
        lookAt.z -= (dx / d) * 1.5;
      }
      camera.position.lerpVectors(follow, shot, b);
      camera.lookAt(this.tmp.lerpVectors(target, lookAt, b));
    } else if (this.flight && game.flying) {
      // in the balloon: switching views starts you looking the default way for that view
      const f = this.flight;
      if (f.view !== game.flying) {
        f.view = game.flying;
        f.yaw0 = game.yaw;
        f.pitch0 = game.pitch;
      }
      balloonCamera(camera, balloon, game.flying, game.yaw - f.yaw0, (game.pitch - f.pitch0) * 0.9);
    } else if (this.ride && inSeat && game.riding && game.riding !== "outside") {
      // in your seat: switching seats (or coming back from outside) starts you looking the seat's way
      const ride = this.ride;
      if (ride.view !== game.riding) {
        ride.view = game.riding;
        ride.yaw0 = game.yaw;
        ride.pitch0 = game.pitch;
        this.showShell(false);
      }
      seatCamera(
        camera,
        ride.vehicle.object,
        ride.seats?.[game.riding] ?? SEATS[ride.vehicle.kind][game.riding],
        game.yaw - ride.yaw0,
        (game.pitch - ride.pitch0) * 0.8,
      );
    } else {
      if (this.ride && this.ride.view !== "outside") {
        // watching from outside: the vehicle's own shell again, the camera behind it
        this.ride.view = "outside";
        game.yaw = this.ride.vehicle.heading;
        game.pitch = 0.32;
        this.showShell(true);
      }
      camera.position.copy(follow);
      // looking up: aim above your head, up to about 30° over the horizon at full tilt, so tall things
      // (the church's spires, the mansion's dome) and the sky come into view without losing the street
      const lift = game.pitch < 0 ? this.camDist * Math.tan(-game.pitch * 0.6) : 0;
      camera.lookAt(this.tmp.set(target.x, target.y + lift, target.z));
    }

    // ---- the world around you -------------------------------------------------------------------
    // from up in the balloon the haze eases back so the whole of Molo shows, and closes in again after
    const fog = (this.root.parent as { fog?: unknown } | null)?.fog;
    if (fog instanceof Fog) {
      const up = this.flight ? 1 : 0;
      fog.near += (90 + up * 110 - fog.near) * Math.min(dt * 0.8, 1);
      fog.far += (360 + up * 200 - fog.far) * Math.min(dt * 0.8, 1);
    }
    this.sky.position.copy(camera.position);
    this.clouds.rotation.y += dt * 0.0025;
    if (sun) {
      // the sun follows you, so its shadows are always crisp where you are
      sun.position.set(game.x + SUN.x * 90, SUN.y * 90, game.z + SUN.z * 90);
      sun.target.position.set(game.x, 0, game.z);
      sun.target.updateMatrixWorld();
    }
    life.update(dt, t, game);
    this.band.update(dt, t, game);

    // the band quest: walk up to the sorbetes man or the guard and they sing you their half of Dandansoy
    const heard = game.preview
      ? null
      : this.songQuest.update(t, game, life, this.band.leader, playing && !this.ride && !this.flight);
    if (heard) {
      game.learned.add(heard);
      const half = heard === "sorbetes" ? DANDANSOY.firstHalf : DANDANSOY.secondHalf;
      const seconds = game.audio.phrase(half, heard === "sorbetes" ? "whistle" : "hum");
      life.sing(heard, t + seconds + 0.3);
      const n = game.learned.size;
      game.emit({
        type: "notice",
        text:
          n === 2
            ? `${heard === "sorbetes" ? "Manong sorbetes whistles" : "The guard hums"} the rest. You know Dandansoy! Now teach the band by St. Anne\u2019s.`
            : `${heard === "sorbetes" ? "Manong sorbetes whistles the first half" : "The guard hums the second half"} (1/2)`,
      });
      if (game.guiding && game.guideTo === "song") game.guide(false);
      game.setSong(n === 2 ? "teach" : "learn");
    }
    confetti.update(dt);

    // the trail to Mark, re-planned as you go
    if (game.guiding) {
      this.trailClock += dt;
      if (this.trailClock > 1.5 && Math.hypot(game.x - this.trailFrom.x, game.z - this.trailFrom.z) > 3) {
        this.trailClock = 0;
        this.trailFrom = { x: game.x, z: game.z };
        if (game.route) game.trail = [[game.x, game.z], ...game.route];
        else game.refreshTrail();
      }
    }
    // the trail to the supermarket clears once you're there (the one to Mark ends when you find him)
    if (game.guiding && game.guideTo !== "mark") {
      const d = game.destination;
      if (Math.hypot(d.x - game.x, d.z - game.z) < 4) game.guide(false);
    }
    trail.update(game.guiding ? game.trail : null, t, (x, z) => world.terrain.heightAt(x, z));

    ring.visible = !!game.target;
    if (game.target) {
      ring.position.set(game.target.x, world.terrain.heightAt(game.target.x, game.target.z) + 0.1, game.target.z);
      ring.scale.setScalar(1 + Math.sin(t * 6) * 0.12);
    }

    // St. Anne's: its outside hides while the camera is in there; its inside shows then, and while
    // you're at the door or inside (so you can see into the nave through the doorway). The bells
    // ring each time you walk into the nave.
    const [cax, caz] = toLocal(CHURCH, camera.position.x, camera.position.z);
    const cameraInside = insideLocal(cax, caz) && camera.position.y < ceilingLocal(cax, caz);
    const [plx, plz] = toLocal(CHURCH, game.x, game.z);
    const atDoor = insideLocal(plx, plz) || (plz > PLAN.porch && plz < PLAN.porch + 8 && Math.abs(plx) < 7);
    world.church.visible = !cameraInside;
    world.churchInside.visible = cameraInside || atDoor;
    const inChurch = insideLocal(plx, plz) && plz < PLAN.narthex;
    if (inChurch && !this.inChurch && game.started) game.audio.bells();
    this.inChurch = inChurch;

    // landmarks you're near
    let near: Landmark | null = null;
    if (game.started && !game.paused) {
      for (const lm of landmarks) if (Math.hypot(lm.x - game.x, lm.z - game.z) < lm.radius) near = lm;
      if (inChurch) near = churchInside;
    }
    if (near !== this.landmark) {
      this.landmark = near;
      if (near?.music) game.audio.playSong(near.music.src, near.music.start);
      else {
        game.audio.stopSong();
        if (near) game.audio.chime();
      }
      game.emit({ type: "landmark", landmark: near });
    }

    // the distance and the arrow on the page
    const hud = game.hud;
    if (hud.distance) hud.distance.textContent = `${Math.max(0, Math.round(toMark))} m`;
    if (hud.arrow)
      hud.arrow.style.transform = `rotate(${-angleTo(game.yaw, Math.atan2(MARK.x - game.x, MARK.z - game.z))}rad)`;
    if (hud.heat) {
      hud.heat.style.transform = `scaleX(${game.heat})`;
      hud.heat.style.backgroundColor = game.heat >= 0.35 ? "#e0612f" : "#7d9bb8";
    }
    const fountains = [world.props.fountain, world.pool];
    game.audio.update(dt, Math.min(...fountains.map((f) => Math.hypot(f.x - game.x, f.z - game.z))));

    // the realistic people, last, once everyone has moved and been posed
    if (this.figures.length) {
      const view = this.view;
      camera.updateMatrixWorld();
      this.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      view.frustum.setFromProjectionMatrix(this.projection);
      camera.getWorldPosition(view.camera);
      view.player.set(game.x, game.y, game.z);
      view.frame++;
      // you and Mark always; the rest take turns at this frame's few re-posings, starting somewhere new
      // each frame so no one waits for long
      const n = this.figures.length;
      view.budget = Infinity;
      for (let i = 0; i < Math.min(2, n); i++) this.figures[i].tick(dt, view);
      view.budget = view.lite ? 10 : 24;
      const from = view.frame % Math.max(1, n - 2);
      for (let i = 0; i < n - 2; i++) this.figures[2 + ((from + i) % (n - 2))].tick(dt, view);
    }
  }

  /**
   * Gives everyone a realistic body: you, Mark, the townsfolk (a model to suit each, wearing their own
   * colours where the model's clothes can take them) and the band in its red and white.
   */
  private dress(humans: Humans) {
    this.humans = humans;
    const rand = seeded(1898);
    this.player.upgrade(humans.make("player"));
    this.corner.mark.upgrade(humans.make("mark"));
    this.figures.push(this.player, this.corner.mark);
    for (const { person, mode } of this.life.figures()) {
      const look = person.look;
      // women in skirts; the sorbetes man and the gate guard (the band quest's singers) are men
      const woman = look.skirt || look.hat === "bun" ? true : mode === "stand" ? false : null;
      const id = mode === "kid" ? "player" : humans.crowd(rand.next, woman);
      const rig = humans.make(id, { shirt: look.shirt, pants: look.pants, indoor: mode === "pray" });
      const idle =
        mode === "stand" ? rand.pick(["talk", "look", "idle"] as const) : rand.next() < 0.3 ? "look" : "idle";
      person.upgrade(rig, idle);
      this.figures.push(person);
    }
    for (const person of this.band.figures()) {
      const rig = humans.make(humans.bandsman(rand.next), { shirt: person.look.shirt, pants: person.look.pants });
      person.upgrade(rig);
      this.figures.push(person);
    }
    // the cook at Kap Ising's, stirring the pancit
    const cook = this.errand.cook;
    cook.upgrade(humans.make(humans.crowd(rand.next, false), { shirt: cook.look.shirt, pants: cook.look.pants }));
    this.figures.push(cook);
    if (this.ride) this.dressRiders(this.ride.cabin.people);
    this.dressRiders(this.jeepneyRiders);
  }

  /** The driver and passengers of a vehicle you've boarded, realistic like everyone else. */
  private dressRiders(people: Person[]) {
    const humans = this.humans;
    if (!humans) return;
    for (const p of people) {
      const look = p.look;
      p.upgrade(humans.make(humans.crowd(this.extrasRand.next, look.skirt ? true : null), look));
      this.figures.push(p);
    }
  }

  dispose() {
    this.alive = false;
    window.clearTimeout(this.gridTimer);
    this.game.attachWorld(null);
    this.sky.geometry.dispose();
    (this.sky.material as Material).dispose();
    this.clouds.traverse((o) => {
      if ("geometry" in o) (o as unknown as { geometry: { dispose: () => void } }).geometry.dispose();
    });
    this.world.dispose();
    this.traffic.dispose();
    this.life.dispose();
    this.jeepneyRiders.forEach((p) => p.dispose());
    this.band.dispose();
    this.player.dispose();
    this.corner.dispose();
    this.waters.dispose();
    this.poolWater.dispose();
    this.flag?.dispose();
    this.trail.dispose();
    this.confetti.dispose();
    this.lostPostcards.dispose();
    this.errand.dispose();
    this.songQuest.dispose();
    this.signs?.dispose();
    this.ride?.cabin.dispose();
    this.balloon.dispose();
  }

  /** Into the basket, and up. */
  private takeOff() {
    const game = this.game;
    this.flight = { view: null, yaw0: 0, pitch0: 0 };
    game.flying = "basket";
    game.route = null;
    game.target = null;
    game.yaw = this.balloon.facing;
    game.pitch = 0.2;
    this.balloon.liftOff();
    game.audio.burner();
    game.emit({ type: "flight", view: "basket" });
  }

  /** Down on the ground: step out beside the basket, clear of anything, and walk on. */
  private stepOut() {
    const game = this.game;
    const b = this.balloon.position;
    const h = this.balloon.facing;
    const p = { x: b.x + Math.sin(h) * 2.4, z: b.z + Math.cos(h) * 2.4 };
    this.world.obstacles.resolve(p, RADIUS, this.traffic.colliders(this.extras));
    game.x = p.x;
    game.z = p.z;
    game.y = this.world.terrain.heightAt(p.x, p.z);
    game.heading = h;
    game.yaw = h + Math.PI; // looking back at the balloon as it goes
    game.pitch = 0.32;
    this.velocity.x = this.velocity.z = 0;
    this.flight = null;
    game.flying = null;
    this.balloon.release();
    game.emit({ type: "flight", view: null });
  }

  /** Climbs into a vehicle: its cabin goes on, you sit down, and it carries on with you aboard. */
  private board(v: Vehicle) {
    const game = this.game;
    // a realistic jeepney has its own seats (and people) inside; anything else gets its painted cabin
    const inside = v.body?.info.interior ? v.body.info.views : null;
    const cabin = inside ? emptyCabin() : buildCabin(v.kind, v.colors, this.world.painted as Material);
    this.dressRiders(cabin.people);
    v.object.add(cabin.group);
    this.traffic.rider = v;
    this.traffic.stopRequested = false;
    const seat = (w: { x: number; y: number; z: number; look: number }): Seat => ({
      at: new Vector3(w.x, w.y, w.z),
      look: w.look,
    });
    const seats = inside ? { passenger: seat(inside.passenger), front: seat(inside.front) } : null;
    this.ride = { vehicle: v, cabin, seats, view: null, yaw0: 0, pitch0: 0 };
    game.riding = "passenger";
    game.route = null;
    game.target = null;
    game.pitch = 0.15;
    game.emit({ type: "ride", view: "passenger", kind: v.kind });
  }

  /** Steps off on the kerb side once the vehicle has stopped, and puts everything back as it was. */
  private alight() {
    const game = this.game;
    const { vehicle, cabin } = this.ride!;
    const h = vehicle.heading;
    // the kerb is on the right (drivers keep right): step off there, clear of the vehicle and anything else
    const p = {
      x: vehicle.object.position.x - Math.cos(h) * (vehicle.kind === "jeepney" ? 2.0 : 1.7),
      z: vehicle.object.position.z + Math.sin(h) * (vehicle.kind === "jeepney" ? 2.0 : 1.7),
    };
    this.world.obstacles.resolve(p, RADIUS, this.traffic.colliders(this.extras));
    game.x = p.x;
    game.z = p.z;
    game.y = this.world.terrain.heightAt(p.x, p.z);
    game.heading = h;
    game.yaw = h;
    game.pitch = 0.32;
    this.velocity.x = this.velocity.z = 0;
    vehicle.object.remove(cabin.group);
    this.figures = this.figures.filter((f) => !(cabin.people as unknown[]).includes(f));
    cabin.dispose();
    this.ride = null;
    this.showShell(true, vehicle);
    this.traffic.rider = null;
    this.traffic.stopRequested = false;
    game.riding = null;
    game.audio.engine(0);
    game.emit({ type: "ride", view: null });
  }

  /**
   * The vehicle's own closed model: hidden while you look from inside, shown from outside. A realistic
   * jeepney is its own cabin, so it stays.
   */
  private showShell(on: boolean, vehicle = this.ride?.vehicle) {
    if (!vehicle) return;
    vehicle.shell.visible = on || !!vehicle.body?.info.interior;
    if (this.ride) this.ride.cabin.group.visible = !on;
  }

  /**
   * Realistic bodies for the cars and jeepneys, and people in the jeepneys: a driver at the wheel and
   * passengers on the benches (fewer on phones). Painted people at first, made realistic with the rest.
   */
  private fitVehicles(vehicles: Vehicles, lite: boolean) {
    this.traffic.upgrade(vehicles);
    const rand = seeded(1912);
    const painted = this.world.painted as Material;
    for (const v of this.traffic.vehicles) {
      const body = v.body;
      if (!body || v.kind !== "jeepney") continue;
      const driver = body.info.seats.find((s) => s.driver);
      const benches = body.info.seats.filter((s) => !s.driver).slice(0, lite ? 1 : 3);
      for (const seat of [driver, ...benches]) {
        if (!seat) continue;
        const p = new Person({ ...crowdLook(rand), umbrella: undefined, backpack: undefined, bag: undefined }, painted);
        p.root.position.set(seat.x, seat.y - 0.81, seat.z);
        p.root.rotation.y = seat.ry;
        p.legL.rotation.x = p.legR.rotation.x = -1.35;
        if (seat.driver) p.armL.rotation.x = p.armR.rotation.x = -1.1; // hands on the wheel
        body.group.add(p.root);
        this.jeepneyRiders.push(p);
      }
    }
    if (this.humans) this.dressRiders(this.jeepneyRiders);
  }
}
