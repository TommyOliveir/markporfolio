// The hot-air balloon on the churchyard lawn (BALLOON in world.ts): an original design in the site's own
// colours, and its flight.
//
// The envelope is a tall teardrop of twelve gores, saffron, rose, teal and ultramarine between cream, with
// a gold band round its widest part and a cream scoop at the mouth. Ropes run down to a wicker basket with
// the burner overhead and sandbags on the sides. Parked, it's held down by tether ropes to four pegs.
//
// The flight: lift off straight up past the church's spires, then drift slowly round Molo (BALLOON_PATH)
// and come back down on the lawn. "Land here" stops it and brings it straight down over the nearest open
// ground (you step out there, and the empty balloon floats back home on its own); "Back" turns it
// back to the lawn.

import {
  AdditiveBlending,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Material,
} from "three";
import { Kit } from "./kit";
import { paintedMaterial } from "./materials";
import { BALLOON, BALLOON_PATH } from "./world";

export type FlyView = "basket" | "outside";
export type BalloonPhase = "parked" | "rising" | "touring" | "travelling" | "descending" | "homing";

const RISE = 2.4; // m/s, going up
const SINK = 1.9; // m/s, coming down
const CRUISE = 4.2; // m/s, drifting along
const TRAVEL = 6; // m/s, heading somewhere (home, or over a landing spot)
const BASKET_EYE = 1.78; // your eyes, standing in the basket (looking out over the rim)

/** The balloon's look: built once, moved about by BalloonFlight. */
function buildModel(painted: Material) {
  const geometries: BufferGeometry[] = [];
  const keep = (g: BufferGeometry | null) => {
    if (g) geometries.push(g);
    return g!;
  };

  // the envelope, double-sided so that looking up from the basket you see into it, not through it
  const env = new Kit();
  const profile = [
    [1.4, 4.2],
    [2.6, 5.2],
    [4.4, 6.8],
    [5.9, 8.6],
    [6.9, 10.6],
    [7.4, 12.6],
    [7.3, 14.6],
    [6.6, 16.6],
    [5.2, 18.4],
    [3.2, 19.7],
    [1.0, 20.4],
    [0.01, 20.55],
  ].map(([r, y]) => new Vector2(r, y));
  const gores = 12;
  const colours = ["#f2a516", "#fdfaf3", "#d63c62", "#fdfaf3", "#1b8e8e", "#fdfaf3", "#2c56b8", "#fdfaf3"];
  for (let i = 0; i < gores; i++)
    env.add(
      new LatheGeometry(profile, 4, (i / gores) * Math.PI * 2, (Math.PI * 2) / gores),
      colours[i % colours.length],
    );
  env.add(new TorusGeometry(5.95, 0.14, 6, 48).rotateX(Math.PI / 2), "#e6ab2e", { y: 8.6 });
  env.add(new TorusGeometry(7.42, 0.1, 6, 56).rotateX(Math.PI / 2), "#e6ab2e", { y: 12.6 });
  env.add(new CylinderGeometry(1.42, 1.25, 1.0, 18, 1, true), "#f4efe4", { y: 3.2 });
  const envelopeMaterial = paintedMaterial(0.07, DoubleSide);
  const envelope = new Mesh(keep(env.build()), envelopeMaterial);
  envelope.castShadow = true;

  // the basket (open on top: four wicker sides, a floor and a leather rim), ropes, burner and sandbags
  const k = new Kit();
  const WICKER = "#a9773f";
  k.box(1.3, 0.08, 1.3, "#6b4a2a", { y: 0.04 });
  for (const s of [-1, 1]) {
    k.box(1.3, 1.0, 0.07, WICKER, { z: s * 0.62 });
    k.box(0.07, 1.0, 1.3, WICKER, { x: s * 0.62 });
    k.box(1.4, 0.1, 0.12, "#5a3a22", { y: 1.0, z: s * 0.64 });
    k.box(0.12, 0.1, 1.4, "#5a3a22", { x: s * 0.64, y: 1.0 });
  }
  for (let y = 0.2; y < 1; y += 0.2) for (const s of [-1, 1]) k.box(1.32, 0.03, 0.08, "#8a5f31", { y, z: s * 0.63 });
  for (const [x, z] of [
    [0.6, 0.6],
    [-0.6, 0.6],
    [0.6, -0.6],
    [-0.6, -0.6],
  ]) {
    const top = new Vector3(x * 2.2, 4.2, z * 2.2);
    const bottom = new Vector3(x, 1.05, z);
    const len = top.distanceTo(bottom);
    // a rope from the basket up to the envelope's mouth: laid along +z, then pointed at the top
    const rope = new CylinderGeometry(0.02, 0.02, len, 4).translate(0, len / 2, 0).rotateX(Math.PI / 2);
    rope.lookAt(top.clone().sub(bottom));
    k.add(rope, "#d9cdb6", { x: bottom.x, y: bottom.y, z: bottom.z });
    k.cyl(0.012, 0.012, 1.35, "#8c8f96", { x: x * 0.95, y: 1.05, z: z * 0.95 }, 5); // slim burner-frame posts
  }
  k.box(1.1, 0.06, 1.1, "#3a3a3e", { y: 2.38 });
  k.cyl(0.18, 0.22, 0.32, "#8c8f96", { y: 2.44 }, 12); // the burner
  k.cyl(0.24, 0.24, 0.05, "#5c5f66", { y: 2.42 }, 12);
  for (const [x, z] of [
    [0.7, 0.3],
    [0.7, -0.3],
    [-0.7, 0.3],
    [-0.7, -0.3],
  ])
    k.ball(1, "#c9b48a", { x, y: 0.75, z, sx: 0.12, sy: 0.16, sz: 0.12 }, 8, 6); // sandbags
  const basket = new Mesh(keep(k.build()), painted);
  basket.castShadow = true;
  basket.receiveShadow = true;

  // the flame, bright and unlit, scaled up while the burner roars
  const flameGeometry = keep(new ConeGeometry(0.22, 1.3, 10).translate(0, 0.65, 0));
  const flameMaterial = new MeshBasicMaterial({
    color: "#ffb23e",
    transparent: true,
    opacity: 0.85,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const flame = new Mesh(flameGeometry, flameMaterial);
  flame.position.y = 2.75;
  const pilot = new Mesh(keep(new ConeGeometry(0.06, 0.2, 6).translate(0, 0.1, 0)), flameMaterial);
  pilot.position.y = 2.75;

  // parked: tether ropes from the basket down to four pegs in the lawn
  const t = new Kit();
  for (const [x, z] of [
    [3.2, 3.2],
    [-3.2, 3.2],
    [3.2, -3.2],
    [-3.2, -3.2],
  ]) {
    t.cyl(0.05, 0.03, 0.35, "#6b4a2a", { x, z }, 6);
    const from = new Vector3(Math.sign(x) * 0.65, 0.9, Math.sign(z) * 0.65);
    const to = new Vector3(x, 0.3, z);
    const len = from.distanceTo(to);
    const rope = new CylinderGeometry(0.018, 0.018, len, 4).translate(0, len / 2, 0).rotateX(Math.PI / 2);
    rope.lookAt(from.clone().sub(to));
    t.add(rope, "#d9cdb6", { x: to.x, y: to.y, z: to.z });
  }
  const tethers = new Mesh(keep(t.build()), painted);

  const craft = new Group(); // everything that flies
  craft.add(envelope, basket, flame, pilot);
  return {
    craft,
    tethers,
    flame,
    dispose() {
      geometries.forEach((g) => g.dispose());
      envelopeMaterial.dispose();
      flameMaterial.dispose();
    },
  };
}

/**
 * The balloon and where it is in its flight. `update` moves it on each frame; the scene puts you in the
 * basket while you're aboard (`carrying`) and reads `phase` to know when you've landed.
 */
export class BalloonFlight {
  readonly group = new Group();
  phase: BalloonPhase = "parked";
  /** you're in the basket */
  carrying = false;
  /** the burner just lit (for the roar) */
  burst = false;
  private model;
  private home = new Vector3(BALLOON.x, 0, BALLOON.z);
  private tour: CatmullRomCurve3;
  private tourLength: number;
  private s = 0;
  /** heading somewhere at altitude, then down at its end */
  private leg: { from: Vector3; to: Vector3; length: number; s: number } | null = null;
  /** where it's coming down (the lawn, or open ground under a "land here") */
  private landing = this.home.clone();
  private burnLeft = 0;
  private nextBurn = 2;
  private heading = 0;

  constructor(
    painted: Material,
    private groundAt: (x: number, z: number) => number,
  ) {
    this.model = buildModel(painted);
    this.group.add(this.model.craft, this.model.tethers);
    this.model.craft.position.copy(this.home);
    this.model.tethers.position.copy(this.home);
    this.tour = new CatmullRomCurve3(
      BALLOON_PATH.map(([x, y, z]) => new Vector3(x, y, z)),
      false,
      "centripetal",
    );
    this.tour.arcLengthDivisions = 400;
    this.tourLength = this.tour.getLength();
  }

  /** Where the basket floor is (the craft's origin), and which way it faces. */
  get position() {
    return this.model.craft.position;
  }
  get facing() {
    return this.heading;
  }

  /** You climb in: up we go. */
  liftOff() {
    this.carrying = true;
    this.phase = "rising";
    this.model.tethers.visible = false;
    this.burn(2.5);
  }

  /** "Land here": stop drifting and come straight down over `spot` (open ground near where you are). */
  landAt(spot: [number, number]) {
    if (!this.carrying || this.phase === "descending") return;
    this.landing.set(spot[0], this.groundAt(spot[0], spot[1]), spot[1]);
    this.travelTo(this.landing);
  }

  /** "Back": back over the lawn by the church, and down. */
  flyHome() {
    if (!this.carrying || this.phase === "descending") return;
    this.landing.copy(this.home);
    this.travelTo(this.home);
  }

  /** You've stepped out: if it's away from home, it floats back there empty. */
  release() {
    this.carrying = false;
    if (this.position.distanceTo(this.home) < 1) this.park();
    else {
      this.phase = "homing";
      this.landing.copy(this.home);
      this.leg = null;
    }
  }

  update(dt: number, t: number, still: boolean) {
    const p = this.position;
    this.burst = false;
    const before = p.clone();

    if (this.phase === "rising") {
      p.y += RISE * dt;
      if (p.y >= BALLOON_PATH[0][1]) {
        p.y = BALLOON_PATH[0][1];
        this.phase = "touring";
        this.s = 0;
      }
    } else if (this.phase === "touring") {
      this.s = Math.min(this.s + CRUISE * dt * (still ? 0.8 : 1), this.tourLength);
      this.tour.getPointAt(this.s / this.tourLength, p);
      if (this.s >= this.tourLength) this.travelTo(this.home);
    } else if (this.phase === "travelling" && this.leg) {
      const L = this.leg;
      L.s = Math.min(L.s + TRAVEL * dt, L.length);
      p.lerpVectors(L.from, L.to, L.length ? L.s / L.length : 1);
      if (L.s >= L.length) {
        this.leg = null;
        this.phase = "descending";
      }
    } else if (this.phase === "descending") {
      p.y = Math.max(p.y - SINK * dt * (p.y - this.landing.y < 6 ? 0.55 : 1), this.landing.y);
      p.x += (this.landing.x - p.x) * Math.min(dt * 2, 1);
      p.z += (this.landing.z - p.z) * Math.min(dt * 2, 1);
    } else if (this.phase === "homing") {
      // empty: up a little, home at height, then down onto the lawn
      if (!this.leg && p.y < 40) p.y += RISE * dt;
      else if (!this.leg) this.travelTo(this.home, "homing");
      else {
        const L = this.leg;
        L.s = Math.min(L.s + TRAVEL * dt, L.length);
        p.lerpVectors(L.from, L.to, L.length ? L.s / L.length : 1);
        if (L.s >= L.length) {
          this.leg = null;
          this.phase = "descending";
        }
      }
    }

    // turn slowly to face the way it's drifting, and sway a little
    const dx = p.x - before.x;
    const dz = p.z - before.z;
    if (Math.hypot(dx, dz) > 0.002) {
      const want = Math.atan2(dx, dz);
      this.heading += Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading)) * Math.min(dt * 0.6, 1);
    }
    const craft = this.model.craft;
    craft.rotation.y = this.heading;
    const airborne = this.phase !== "parked" && p.y - this.groundAt(p.x, p.z) > 0.3;
    craft.rotation.z = still ? 0 : Math.sin(t * 0.7) * (airborne ? 0.02 : 0.008);
    craft.rotation.x = still ? 0 : Math.sin(t * 0.53 + 1) * (airborne ? 0.015 : 0.006);

    // the burner: roars on a timer while climbing or cruising, and the pilot light otherwise
    if (this.phase === "rising" || this.phase === "touring" || this.phase === "travelling") {
      this.nextBurn -= dt;
      if (this.nextBurn <= 0) {
        this.burn(1.2 + Math.random() * 0.8);
        this.nextBurn = 6 + Math.random() * 5;
      }
    }
    this.burnLeft = Math.max(this.burnLeft - dt, 0);
    const fire = this.burnLeft > 0 ? 1 + Math.sin(t * 40) * 0.15 : 0;
    this.model.flame.visible = fire > 0;
    this.model.flame.scale.set(fire, fire * (1.2 + Math.sin(t * 23) * 0.2), fire);
  }

  /** It's down on the ground with you aboard, ready for you to step out. */
  get touchedDown() {
    return this.phase === "descending" && this.position.y <= this.landing.y + 0.01;
  }

  /** Back on its lawn: tied down and waiting. */
  get emptyAtHome() {
    return this.phase === "parked";
  }

  /** Lands back home after an empty trip, tying itself down. */
  settle() {
    if (!this.carrying && this.phase === "descending" && this.touchedDown) this.park();
  }

  private park() {
    this.phase = "parked";
    this.position.copy(this.home);
    this.model.tethers.visible = true;
    this.heading = 0;
  }

  private burn(seconds: number) {
    this.burnLeft = seconds;
    this.burst = true;
  }

  private travelTo(target: Vector3, phase: BalloonPhase = "travelling") {
    const from = this.position.clone();
    const to = new Vector3(target.x, from.y, target.z);
    this.leg = { from, to, length: from.distanceTo(to), s: 0 };
    this.phase = phase;
  }

  dispose() {
    this.model.dispose();
  }
}

const look = new Vector3();

/**
 * The camera while you fly: standing in the basket looking out (and down, to start with), or circling
 * the balloon from outside. `turn` and `tilt` are how far you've dragged to look round.
 */
export function balloonCamera(
  camera: { position: Vector3; lookAt(v: Vector3): void },
  balloon: BalloonFlight,
  view: FlyView,
  turn: number,
  tilt: number,
) {
  const p = balloon.position;
  const a = balloon.facing + turn;
  if (view === "basket") {
    // at the front of the basket, leaning out a little, so the frame posts are beside you, not in front
    camera.position.set(p.x + Math.sin(a) * 0.4, p.y + BASKET_EYE, p.z + Math.cos(a) * 0.4);
    const down = Math.max(-1.1, Math.min(1.25, 0.18 + tilt));
    look.set(
      camera.position.x + Math.sin(a) * Math.cos(down),
      camera.position.y - Math.sin(down),
      camera.position.z + Math.cos(a) * Math.cos(down),
    );
  } else {
    const up = Math.max(-0.2, Math.min(1.2, 0.25 + tilt));
    const r = 26;
    camera.position.set(
      p.x - Math.sin(a) * Math.cos(up) * r,
      p.y + 9 + Math.sin(up) * r,
      p.z - Math.cos(a) * Math.cos(up) * r,
    );
    look.set(p.x, p.y + 7, p.z);
  }
  camera.lookAt(look);
}

/** How far round the parked basket and its tethers you can't walk. */
export const PARKED_RADIUS = 2.4;
