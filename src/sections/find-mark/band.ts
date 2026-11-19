// The Molo marching band. Twenty bandsmen in red and white with plumed shakos (a drum major, three
// trumpets, three mellophones, three trombones, three baritones, two sousaphones, a bass drum, snares, a
// tenor drummer and cymbals) stand at ease beside St. Anne's, by the convent. Ask them and they strike
// up a tune, file out onto Jocson Street and march up and down in front of the church; walk
// up to them while they're marching and you can tell them to stop, and they go back to their spot.

import { ConeGeometry, CylinderGeometry, Group, Quaternion, TorusGeometry, Vector3, type Material } from "three";
import { seeded } from "@/lib/seeded";
import type { Circle, Obstacles } from "./collide";
import type { BandState, Game } from "./game";
import { Kit } from "./kit";
import { roads } from "./molo-map";
import { Person } from "./people";
import { CHURCH, toWorld } from "./world";

type Part =
  "major" | "trumpet" | "mellophone" | "trombone" | "baritone" | "sousaphone" | "bass" | "snare" | "tenor" | "cymbals";

/** The block, front row first, three abreast; the drum major leads from in front. */
const ROWS: Part[][] = [
  ["trumpet", "trumpet", "trumpet"],
  ["mellophone", "mellophone", "mellophone"],
  ["trombone", "trombone", "trombone"],
  ["baritone", "baritone", "baritone"],
  ["sousaphone", "bass", "sousaphone"],
  ["snare", "tenor", "snare"],
  ["cymbals"],
];
const ROW_GAP = 1.5;
const COL_GAP = 1.2;
const MARCH = 1.25; // m/s
const WALK = 1.7; // filing out and back
const LANE = 2.1; // each way up and down the street keeps this far from its middle
/** Where they stand at ease, in the church's frame: beside the north aisle, toward the convent. */
const REST = { lx: -20.5, lz: -4 };

const GOLD = "#d8b24a";
const SILVER = "#c9ccd1";
const RED = "#c8102e";
const WHITE = "#f4f1ea";
const UP = new Vector3(0, 1, 0);

type Member = {
  person: Person;
  part: Part;
  /** place in the block: metres behind the drum major, and to the side (+ = left) */
  back: number;
  side: number;
  /** a pivot holding the instrument, tipped down when they're at ease */
  horn: Group | null;
  x: number;
  z: number;
  heading: number;
  restX: number;
  restZ: number;
  arrived: boolean;
  phase: number;
};

export class Band {
  readonly group = new Group();
  private members: Member[] = [];
  private route: { pts: [number, number][]; cum: number[]; length: number };
  private s = 0;
  private start = 0;
  private restFacing = CHURCH.angle; // facing the way the church does: out toward the street
  private colliderList: Circle[] = [];
  private stoppers: { x: number; z: number }[] = [];

  constructor(
    material: Material,
    private obstacles: Obstacles,
  ) {
    this.route = buildRoute();
    // start a little way along the street from the convent end, so the whole block fits on it
    this.start = 2 + ROWS.length * ROW_GAP;
    this.s = this.start;

    const rand = seeded(1885);
    const skins = ["#c68863", "#b97a55", "#d39b74", "#a86c4a", "#e0b08a"];
    const hairs = ["#1d1b1a", "#2b211c", "#3a2a20"];
    const add = (part: Part, back: number, side: number) => {
      const major = part === "major";
      const person = new Person(
        {
          skin: rand.pick(skins),
          hair: rand.pick(hairs),
          shirt: major ? "#1a2b52" : RED,
          pants: WHITE,
          shoes: "#151515",
          hat: "shako",
          hatColor: major ? "#1a2b52" : WHITE,
          plume: major ? WHITE : RED,
        },
        material,
      );
      const horn = dress(person, part, material);
      // their place at ease: the same block, facing the street
      const [restX, restZ] = toWorld(CHURCH, REST.lx + side, REST.lz - back);
      const m: Member = {
        person,
        part,
        back,
        side,
        horn,
        x: restX,
        z: restZ,
        heading: this.restFacing,
        restX,
        restZ,
        arrived: true,
        phase: rand.range(0, 6),
      };
      this.members.push(m);
      this.group.add(person.root);
    };
    add("major", -1.6, 0);
    ROWS.forEach((row, r) =>
      row.forEach((part, c) => add(part, r * ROW_GAP, row.length === 1 ? 0 : (1 - c) * COL_GAP)),
    );
    this.place(0);
  }

  /** The bandsmen as circles you bump into. */
  colliders() {
    this.colliderList.length = 0;
    for (const m of this.members) this.colliderList.push({ x: m.x, z: m.z, r: 0.35, h: 1.8 });
    return this.colliderList;
  }

  /** Where the bandsmen are while they're out on the street (for the traffic to stop for). */
  onStreet() {
    this.stoppers.length = 0;
    if (this.state !== "rest") for (const m of this.members) this.stoppers.push(m);
    return this.stoppers;
  }

  private state: BandState = "rest";
  /** seconds spent filing out or back: after a while, stragglers are put in their places */
  private clock = 0;

  update(dt: number, t: number, game: Game) {
    const request = game.bandRequest;
    game.bandRequest = null;
    if (request === "play" && (this.state === "rest" || this.state === "returning")) {
      this.state = "gathering";
      this.s = this.start;
      this.clock = 0;
      this.members.forEach((m) => (m.arrived = false));
      game.audio.playBand();
    } else if (request === "stop" && (this.state === "gathering" || this.state === "parade")) {
      this.state = "returning";
      this.clock = 0;
      this.members.forEach((m) => (m.arrived = false));
      game.audio.stopBand();
    }

    if (this.state === "parade") this.s += MARCH * dt;
    this.clock = this.state === "gathering" || this.state === "returning" ? this.clock + dt : 0;
    this.place(dt);

    if (this.state === "gathering" && this.members.every((m) => m.arrived)) this.state = "parade";
    if (this.state === "returning" && this.members.every((m) => m.arrived)) this.state = "rest";

    // near enough to talk to: by their block when at ease, or bumping into any of them on the march
    let nearest = Infinity;
    let cx = 0;
    let cz = 0;
    for (const m of this.members) {
      nearest = Math.min(nearest, Math.hypot(m.x - game.x, m.z - game.z));
      cx += m.x / this.members.length;
      cz += m.z / this.members.length;
    }
    const resting = this.state === "rest" || this.state === "returning";
    const near = game.started && !game.paused && (resting ? nearest < 4.5 : nearest < 2.2);
    game.audio.bandDistance(dt, Math.hypot(cx - game.x, cz - game.z));

    if (this.state !== game.band || near !== game.bandNear) {
      game.band = this.state;
      game.bandNear = near;
      game.emit({ type: "band", state: this.state, near });
    }
    this.pose(dt, t);
  }

  /** Moves everyone to where they should be: in the block on the march, or walking out or back. */
  private place(dt: number) {
    const marching = this.state === "parade";
    for (const m of this.members) {
      let tx: number;
      let tz: number;
      let th: number;
      if (this.state === "rest" || this.state === "returning") {
        tx = m.restX;
        tz = m.restZ;
        th = this.restFacing;
      } else {
        const [px, pz, hx, hz] = this.at(this.s - m.back);
        // to the bandsman's left (+side) or right of the way they're going
        tx = px + hz * m.side;
        tz = pz - hx * m.side;
        th = Math.atan2(hx, hz);
      }
      let speed = 0;
      if (marching || dt === 0) {
        speed = dt > 0 ? Math.hypot(tx - m.x, tz - m.z) / dt : 0;
        m.x = tx;
        m.z = tz;
        m.heading = th;
      } else {
        const dx = tx - m.x;
        const dz = tz - m.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.08 || this.clock > 30) {
          // there (or held up by something for too long: put them in their place)
          m.x = tx;
          m.z = tz;
          m.arrived = true;
          m.heading += angle(m.heading, th) * Math.min(dt * 4, 1);
        } else {
          m.arrived = false;
          const step = Math.min(WALK * dt, d);
          const p = { x: m.x + (dx / d) * step, z: m.z + (dz / d) * step };
          this.obstacles.resolve(p, 0.3, []);
          m.x = p.x;
          m.z = p.z;
          speed = WALK;
          m.heading += angle(m.heading, Math.atan2(dx, dz)) * Math.min(dt * 6, 1);
        }
      }
      m.person.root.position.set(m.x, 0, m.z);
      m.person.root.rotation.y = m.heading;
      m.person.animate(dt, Math.min(speed, 2.2), m.phase);
    }
  }

  /** Arms and instruments: playing on the move, at ease (instruments down) when resting. */
  private pose(dt: number, t: number) {
    const playing = this.state === "gathering" || this.state === "parade";
    const beat = t * Math.PI * 2; // two beats a second
    for (const m of this.members) {
      const p = m.person;
      const swing = Math.sin(beat + m.phase * 0.2);
      if (m.horn)
        m.horn.rotation.x += ((playing ? Math.sin(beat / 2) * 0.03 : 1.15) - m.horn.rotation.x) * Math.min(dt * 5, 1);
      if (!playing) {
        if (m.part === "major") p.armR.rotation.set(-0.2, 0, 0.1);
        else {
          p.armL.rotation.set(-0.15, 0, -0.05);
          p.armR.rotation.set(-0.5, 0, 0.25);
        }
        continue;
      }
      switch (m.part) {
        case "major":
          // the mace, pumped up and down in time
          p.armR.rotation.set(-1.4 - Math.max(0, swing) * 1.3, 0, 0.15);
          break;
        case "trumpet":
        case "mellophone":
        case "trombone":
          p.armL.rotation.set(-1.62, 0, -0.42);
          p.armR.rotation.set(-1.62, 0, 0.4);
          break;
        case "baritone":
          p.armL.rotation.set(-0.95, 0, -0.5);
          p.armR.rotation.set(-0.95, 0, 0.5);
          break;
        case "sousaphone":
          p.armL.rotation.set(-0.3, 0, 0.1);
          p.armR.rotation.set(-0.85, 0, 0.3);
          break;
        case "snare":
        case "tenor":
          p.armL.rotation.set(-0.75 - Math.max(0, swing) * 0.4, 0, -0.35);
          p.armR.rotation.set(-0.75 - Math.max(0, -swing) * 0.4, 0, 0.35);
          break;
        case "bass":
          p.armL.rotation.set(-0.95 - Math.max(0, swing) * 0.35, 0, -0.75);
          p.armR.rotation.set(-0.95 - Math.max(0, -swing) * 0.35, 0, 0.75);
          break;
        case "cymbals": {
          // a crash every other bar: the plates swing apart and clap together
          const open = 0.2 + Math.abs(Math.sin(beat / 4)) * 0.5;
          p.armL.rotation.set(-1.1, 0, -0.85 + open);
          p.armR.rotation.set(-1.1, 0, 0.85 - open);
          break;
        }
      }
    }
  }

  /** A point on the march, and the way forward there, `s` metres round the loop. */
  private at(s: number): [number, number, number, number] {
    const { pts, cum, length } = this.route;
    s = ((s % length) + length) % length;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const [ax, az] = pts[i - 1];
    const [bx, bz] = pts[i];
    const seg = cum[i] - cum[i - 1] || 1;
    const f = (s - cum[i - 1]) / seg;
    return [ax + (bx - ax) * f, az + (bz - az) * f, (bx - ax) / seg, (bz - az) / seg];
  }

  dispose() {
    this.members.forEach((m) => m.person.dispose());
  }
}

const angle = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

/**
 * The parade route: up Jocson Street from the convent end to the plaza corner on one side of the street,
 * a wheel round, and back down the other side, as one closed loop sampled every half metre.
 */
function buildRoute() {
  const jocson = roads
    .filter((r) => r.name === "Jocson Street")
    .flatMap((r) => {
      const out: [number, number][] = [];
      for (let i = 0; i < r.points.length; i += 2) out.push([r.points[i], r.points[i + 1]]);
      return out;
    });
  // the stretch in front of the church: from beside the convent to the corner of the plaza
  const near = (x: number, z: number) =>
    jocson.reduce((best, p) => (Math.hypot(p[0] - x, p[1] - z) < Math.hypot(best[0] - x, best[1] - z) ? p : best));
  const a = near(18, -58);
  const b = near(36, -22);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len;
  const uz = (b[1] - a[1]) / len;
  // "left" of heading from a to b
  const lx = -uz;
  const lz = ux;
  const pts: [number, number][] = [];
  const line = (x0: number, z0: number, x1: number, z1: number) => {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5);
    for (let i = 0; i < n; i++) pts.push([x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n]);
  };
  // half a circle round (cx, cz): from offset (ox, oz) round to the opposite side, bulging out along (fx, fz)
  const wheel = (cx: number, cz: number, ox: number, oz: number, fx: number, fz: number) => {
    for (let i = 0; i < 16; i++) {
      const a2 = (i / 16) * Math.PI;
      pts.push([cx + ox * Math.cos(a2) + fx * LANE * Math.sin(a2), cz + oz * Math.cos(a2) + fz * LANE * Math.sin(a2)]);
    }
  };
  // up the right-hand side (as you face the plaza), round, and back down the other
  line(a[0] - lx * LANE, a[1] - lz * LANE, b[0] - lx * LANE, b[1] - lz * LANE);
  wheel(b[0], b[1], -lx * LANE, -lz * LANE, ux, uz);
  line(b[0] + lx * LANE, b[1] + lz * LANE, a[0] + lx * LANE, a[1] + lz * LANE);
  wheel(a[0], a[1], lx * LANE, lz * LANE, -ux, -uz);
  pts.push(pts[0]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, length: cum[cum.length - 1] };
}

// ---------------------------------------------------------------------------------------------
// Instruments, in the bandsman's own frame (facing +z, feet at y = 0, mouth at about y 1.53, z 0.2)

function tube(k: Kit, a: [number, number, number], b: [number, number, number], r: number, color = GOLD) {
  const d = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length();
  const g = new CylinderGeometry(r, r, len, 8);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(UP, d.normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  k.add(g, color);
}

/** A flared bell, its mouth at `at` facing `dir`. */
function bell(
  k: Kit,
  at: [number, number, number],
  dir: [number, number, number],
  r: number,
  len: number,
  color = GOLD,
) {
  const d = new Vector3(...dir).normalize();
  const g = new ConeGeometry(r, len, 16);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(UP, d.clone().negate()));
  g.translate(at[0] - (d.x * len) / 2, at[1] - (d.y * len) / 2, at[2] - (d.z * len) / 2);
  k.add(g, color);
}

/**
 * Hands the bandsman an instrument. Horns go on a pivot at the chest (returned), so they can be tipped
 * down at ease; drums hang from the body; sticks, mallets, cymbals and the mace go in the hands.
 */
function dress(p: Person, part: Part, material: Material): Group | null {
  const k = new Kit();
  const hand = (side: "L" | "R", build: (h: Kit) => void) => {
    const h = new Kit();
    build(h);
    p.attach(side === "L" ? p.armL : p.armR, h, material);
  };
  const stick = (h: Kit) => tube(h, [0, -0.6, 0], [0, -0.66, 0.38], 0.012, "#e8dcc0");
  let pivot: Group | null = null;
  const onPivot = () => {
    pivot = new Group();
    pivot.position.set(0, 1.25, 0.12);
    p.body.add(pivot);
  };

  switch (part) {
    case "major":
      hand("R", (h) => {
        tube(h, [0, -0.6, 0.05], [0, -0.2, 0.75], 0.016, SILVER);
        h.ball(0.06, SILVER, { y: -0.18, z: 0.78 });
        h.cyl(0.025, 0.025, 0.12, RED, { y: -0.68, z: -0.12, rx: 0.6 });
      });
      break;
    case "trumpet":
    case "mellophone": {
      onPivot();
      const big = part === "mellophone";
      const y = 0.28; // mouth height above the pivot
      tube(k, [0, y, 0.08], [0, y, big ? 0.48 : 0.55], 0.013);
      tube(k, [0, y - 0.06, 0.18], [0, y - 0.06, 0.42], 0.012);
      for (let i = 0; i < 3; i++) k.cyl(0.016, 0.016, 0.1, SILVER, { y: y - 0.09, z: 0.24 + i * 0.045 }, 6);
      if (big) k.add(new TorusGeometry(0.075, 0.012, 6, 18), GOLD, { y: y - 0.04, z: 0.34, ry: Math.PI / 2 });
      bell(k, [0, y, big ? 0.72 : 0.7], [0, 0, 1], big ? 0.11 : 0.065, big ? 0.26 : 0.16);
      break;
    }
    case "trombone": {
      onPivot();
      const y = 0.28;
      // the slide, out in front, and the bell section over the left shoulder
      tube(k, [0, y, 0.08], [0, y, 0.95], 0.012);
      tube(k, [0, y - 0.09, 0.2], [0, y - 0.09, 0.95], 0.012);
      tube(k, [0, y - 0.09, 0.95], [0, y, 0.95], 0.014);
      tube(k, [0.06, y + 0.04, 0.0], [0.06, y + 0.04, 0.45], 0.013);
      tube(k, [0, y, 0.08], [0.06, y + 0.04, 0.0], 0.012);
      bell(k, [0.06, y + 0.04, 0.68], [0, 0, 1], 0.1, 0.25);
      break;
    }
    case "baritone": {
      onPivot();
      // held upright in front of the chest, the bell up and forward
      tube(k, [0, 0.28, 0.08], [0, 0.18, 0.22], 0.012);
      tube(k, [0, -0.25, 0.28], [0, 0.22, 0.28], 0.045);
      k.add(new TorusGeometry(0.07, 0.03, 6, 12, Math.PI), GOLD, { y: -0.25, z: 0.35, rx: Math.PI, ry: Math.PI / 2 });
      tube(k, [0, -0.25, 0.42], [0, 0.2, 0.42], 0.06);
      for (let i = 0; i < 3; i++)
        k.cyl(0.016, 0.016, 0.1, SILVER, { x: 0.06, y: -0.02 + i * 0.06, z: 0.3, rz: Math.PI / 2 }, 6);
      bell(k, [0, 0.45, 0.5], [0, 0.75, 0.66], 0.15, 0.3);
      break;
    }
    case "sousaphone": {
      // wrapped round the body, the great white bell above the head facing forward
      k.add(new TorusGeometry(0.38, 0.055, 8, 28), GOLD, { y: 1.1, rx: Math.PI / 2 + 0.35, rz: 0.25 });
      tube(k, [0, 1.53, 0.2], [-0.22, 1.25, 0.28], 0.014);
      tube(k, [0.3, 1.2, 0.12], [0.22, 2.0, -0.02], 0.07);
      bell(k, [0.22, 2.22, 0.32], [0, 0.12, 1], 0.38, 0.45, WHITE);
      k.add(new TorusGeometry(0.38, 0.025, 6, 28), GOLD, { x: 0.22, y: 2.2, z: 0.31 });
      for (let i = 0; i < 3; i++) k.cyl(0.018, 0.018, 0.11, SILVER, { x: -0.18 + i * 0.05, y: 1.15, z: 0.34 }, 6);
      break;
    }
    case "bass":
      k.add(new CylinderGeometry(0.36, 0.36, 0.3, 24).rotateZ(Math.PI / 2), WHITE, { y: 0.95, z: 0.38 });
      for (const x of [-0.15, 0.15])
        k.add(new CylinderGeometry(0.37, 0.37, 0.03, 24).rotateZ(Math.PI / 2), RED, { x, y: 0.95, z: 0.38 });
      for (const side of ["L", "R"] as const)
        hand(side, (h) => {
          tube(h, [0, -0.6, 0], [0, -0.62, 0.3], 0.012, "#e8dcc0");
          h.ball(0.05, WHITE, { y: -0.62, z: 0.32 });
        });
      break;
    case "snare":
      k.cyl(0.19, 0.19, 0.16, WHITE, { y: 0.84, z: 0.34, rx: 0.12 }, 18);
      k.cyl(0.2, 0.2, 0.025, RED, { y: 0.835, z: 0.34, rx: 0.12 }, 18);
      k.cyl(0.2, 0.2, 0.025, RED, { y: 0.98, z: 0.32, rx: 0.12 }, 18);
      hand("L", stick);
      hand("R", stick);
      break;
    case "tenor":
      for (const [x, z] of [
        [-0.15, 0.3],
        [0.15, 0.3],
        [0, 0.48],
      ]) {
        k.cyl(0.12, 0.12, 0.13, WHITE, { x, y: 0.88, z }, 14);
        k.cyl(0.125, 0.125, 0.02, RED, { x, y: 1.0, z }, 14);
      }
      hand("L", stick);
      hand("R", stick);
      break;
    case "cymbals":
      for (const side of ["L", "R"] as const)
        hand(side, (h) =>
          h.add(new CylinderGeometry(0.17, 0.17, 0.012, 18).rotateZ(Math.PI / 2), GOLD, {
            x: side === "L" ? -0.05 : 0.05,
            y: -0.64,
          }),
        );
      break;
  }
  if (!k.empty) {
    if (pivot) p.attach(pivot, k, material);
    else p.attach(p.body, k, material);
  }
  return pivot;
}
