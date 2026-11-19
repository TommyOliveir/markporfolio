// The walk, frame by frame: builds the stage (the map, traffic, crowd, you and Mark), then on every
// frame reads the controls, moves you (walking, running, jumping, climbing steps, bumping into things),
// moves the camera (following you, keeping out of walls, the intro swoop and the "found him" shot),
// and brings the rest of Molo along — jeepneys, people, pigeons, the trail to Mark and the sounds.

import {
  Group,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
  type Camera,
  type DirectionalLight,
  type Material,
  type Object3D,
} from "three";
import { buildWorld } from "./build-world";
import type { Circle } from "./collide";
import { Confetti, Trail, buildClickRing, buildFlag, buildSigns, buildWaters } from "./effects";
import type { Game } from "./game";
import { loadFonts } from "./labels";
import { Life } from "./life";
import { buildMarkCorner } from "./mark";
import { seeThrough, time } from "./materials";
import { Person } from "./people";
import { SUN, buildClouds, buildSky } from "./sky";
import { Traffic } from "./traffic";
import { ceilingLocal, insideLocal, PLAN } from "./church-interior";
import {
  CHURCH,
  FOUND_RADIUS,
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
const RUN = 7.6;
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
  private player: Person;
  private corner: ReturnType<typeof buildMarkCorner>;
  private waters: ReturnType<typeof buildWaters>;
  private poolWater: ReturnType<typeof buildWaters>;
  private flag: ReturnType<typeof buildFlag> | null;
  private signs: ReturnType<typeof buildSigns> | null = null;
  private trail = new Trail();
  private ring = buildClickRing();
  private confetti: Confetti;
  private gridTimer = 0;
  private alive = true;

  // per-frame bookkeeping
  private extras: Circle[] = [];
  private stepDist = 0;
  private landmark: Landmark | null = null;
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

  constructor(
    private game: Game,
    lite: boolean,
  ) {
    const world = buildWorld(lite);
    this.world = world;
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
    });
    this.player = new Person(
      { skin: "#c68863", hair: "#2b211c", shirt: "#d63c62", pants: "#1a2b52", hat: "straw", backpack: "#f2a516" },
      painted,
    );
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

    this.root.add(
      world.root,
      this.clouds,
      this.traffic.group,
      this.life.group,
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

    game.attachWorld(world.obstacles);
    // the route planner's grid takes a moment; build it once the first frames are on screen
    if (!game.preview) this.gridTimer = window.setTimeout(() => game.setWalkGrid(world.walkGrid()), 400);
    loadFonts().then(() => {
      if (!this.alive) return;
      this.signs = buildSigns(world.props.signPlacements, world.props.welcomeSign);
      this.root.add(this.signs.group);
      this.corner.repaint();
    });
  }

  frame(t: number, rawDt: number, camera: Camera, sun: DirectionalLight | null) {
    const dt = Math.min(rawDt, 1 / 20);
    time.value = t;
    const game = this.game;
    const { world, traffic, life, player, corner, trail, ring, confetti } = this;
    // trees between the camera and the walker thin out so you can always see him
    seeThrough.on.value = game.started ? 1 : 0;
    seeThrough.target.value.set(game.x, game.y + 1.1, game.z);

    if (!this.readySent) {
      this.readySent = true;
      game.emit({ type: "ready" });
    }

    // ---- a click on the scene: walk there -----------------------------------------------------
    if (game.click && game.started && !game.paused) {
      this.raycaster.setFromCamera(new Vector2(game.click.x, game.click.y), camera);
      // (hidden meshes still get hit by a ray, so skip them: inside the church, the outside is hidden)
      const shown = (o: Object3D | null): boolean => !o || (o.visible && shown(o.parent));
      const hit = this.raycaster.intersectObjects(world.clickable, false).find((h) => shown(h.object));
      if (hit) game.walkTo(hit.point.x, hit.point.z);
    }
    game.click = null;

    // ---- you ----------------------------------------------------------------------------------
    const k = game.keys;
    const playing = game.started && !game.paused;
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
    extras.push(...life.people());
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

    player.root.position.set(game.x, game.y, game.z);
    player.root.rotation.y = game.heading;
    player.animate(dt, game.speed, t, !game.grounded);

    // ---- Mark -----------------------------------------------------------------------------------
    const toMark = game.distanceToMark;
    corner.update(t, game.found, toMark, Math.atan2(game.x - MARK.x, game.z - MARK.z));
    if (playing && !game.found && toMark < FOUND_RADIUS && game.y > 0.6) {
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

    // ---- the camera -----------------------------------------------------------------------------
    // a wider view, from a little further back, on a phone held upright
    const upright = camera instanceof PerspectiveCamera && camera.aspect < 0.9;
    if (camera instanceof PerspectiveCamera) {
      const fov = upright ? 64 : 50;
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
      camera.position.lerpVectors(follow, shot, b);
      camera.lookAt(this.tmp.lerpVectors(target, lookAt, b));
    } else {
      camera.position.copy(follow);
      // looking up: aim above your head, up to about 30° over the horizon at full tilt, so tall things
      // (the church's spires, the mansion's dome) and the sky come into view without losing the street
      const lift = game.pitch < 0 ? this.camDist * Math.tan(-game.pitch * 0.6) : 0;
      camera.lookAt(this.tmp.set(target.x, target.y + lift, target.z));
    }

    // ---- the world around you -------------------------------------------------------------------
    this.sky.position.copy(camera.position);
    this.clouds.rotation.y += dt * 0.0025;
    if (sun) {
      // the sun follows you, so its shadows are always crisp where you are
      sun.position.set(game.x + SUN.x * 90, SUN.y * 90, game.z + SUN.z * 90);
      sun.target.position.set(game.x, 0, game.z);
      sun.target.updateMatrixWorld();
    }
    traffic.update(dt, game);
    life.update(dt, t, game);
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
    const fountains = [world.props.fountain, world.pool];
    game.audio.update(dt, Math.min(...fountains.map((f) => Math.hypot(f.x - game.x, f.z - game.z))));
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
    this.player.dispose();
    this.corner.dispose();
    this.waters.dispose();
    this.poolWater.dispose();
    this.flag?.dispose();
    this.trail.dispose();
    this.confetti.dispose();
    this.signs?.dispose();
  }
}
