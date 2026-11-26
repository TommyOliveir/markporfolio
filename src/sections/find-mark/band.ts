// The Molo marching band. Twenty bandsmen in red and white with plumed shakos (a drum major, three
// trumpets, three mellophones, three trombones, three baritones, two sousaphones, a bass drum, snares, a
// tenor drummer and cymbals) stand at ease beside St. Anne's, by the convent. Ask them and they strike
// up a tune, file out onto Jocson Street and march up and down in front of the church; walk
// up to them while they're marching and you can tell them to stop, and they go back to their spot.

import { ConeGeometry, CylinderGeometry, Group, Quaternion, TorusGeometry, Vector3, type Material } from "three";
import { seeded } from "@/lib/seeded";
import type { Circle } from "./collide";
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
  /** place in the block: metres behind the front rank (the drum major leads, at -1.6), and to the side */
  back: number;
  side: number;
  /** a pivot holding the instrument, tipped down when they're at ease */
  horn: Group | null;
  x: number;
  z: number;
  heading: number;
  phase: number;
};

/**
 * A turn the drum major made when you spoke to them: from `join` metres along the band's way, they
 * march `path` — home to their spot (`loopAt` null), or back onto the parade loop, rejoining it
 * `loopAt` metres round. The ranks behind follow him through it, each turning where he did.
 */
type Leg = { join: number; path: Path; loopAt: number | null };

export class Band {
  readonly group = new Group();
  private members: Member[] = [];
  private route: ReturnType<typeof buildRoute>;
  /** set each frame by the walk: no cars left on the parade stretch, so the band can march out */
  streetClear = true;
  /**
   * How far along the band's way the front rank is: first the way out (from behind their spot, through
   * it and onto the street), then round and round the loop on Jocson Street, then (told to stop) home.
   */
  private s: number;
  private legs: Leg[] = [];
  private state: BandState = "rest";
  private colliderList: Circle[] = [];
  private stoppers: { x: number; z: number }[] = [];

  constructor(material: Material) {
    this.route = buildRoute();
    this.s = this.route.restAt;

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
      this.members.push({ person, part, back, side, horn, x: 0, z: 0, heading: 0, phase: rand.range(0, 6) });
      this.group.add(person.root);
    };
    add("major", -1.6, 0);
    ROWS.forEach((row, r) =>
      row.forEach((part, c) => add(part, r * ROW_GAP, row.length === 1 ? 0 : (1 - c) * COL_GAP)),
    );
    this.place(0);
  }

  /** Where the drum major is (for the band quest's ♪ marker and the trail to the band). */
  get leader() {
    const m = this.members[0];
    return { x: m.x, z: m.z };
  }

  /** The bandsmen as circles you bump into. */
  colliders() {
    this.colliderList.length = 0;
    for (const m of this.members) this.colliderList.push({ x: m.x, z: m.z, r: 0.35, h: 1.8 });
    return this.colliderList;
  }

  /** Where the bandsmen are while they're out (for the traffic to stop for). */
  onStreet() {
    this.stoppers.length = 0;
    if (this.state !== "rest") for (const m of this.members) this.stoppers.push(m);
    return this.stoppers;
  }

  /**
   * The stretch of Jocson Street the band takes over, as a line with a width (cars keep out of it
   * while the band is anywhere but at rest), or null when they're at rest.
   */
  zone() {
    return this.state === "rest" ? null : this.route.zone;
  }

  update(dt: number, t: number, game: Game) {
    const request = game.bandRequest;
    game.bandRequest = null;
    // already out and playing, asked for the other tune: they just change songs
    if (request === "play" && (this.state === "gathering" || this.state === "parade"))
      game.audio.playBand(game.bandSong);
    if (request === "play" && (this.state === "rest" || this.state === "returning")) {
      game.audio.playBand(game.bandSong);
      if (this.state === "rest") {
        // strike up where they stand; they step off once the street is clear of cars
        this.state = "gathering";
      } else {
        // on their way home: turn about and march back onto the parade
        this.state = "parade";
        this.turn((p, h) => this.route.rejoin(p, h));
      }
    } else if (request === "stop" && (this.state === "gathering" || this.state === "parade")) {
      game.audio.stopBand();
      if (this.state === "gathering") this.state = "rest";
      else {
        this.state = "returning";
        const wayOut = this.legs.length === 0 && this.s + 1.6 < this.route.entry.length;
        this.turn((p, h) => ({ path: this.route.homeFrom(p, h, wayOut), loopAt: null }));
      }
    }

    if (this.state === "gathering" && this.streetClear) this.state = "parade";
    if (this.state === "parade" || this.state === "returning") this.s += MARCH * dt;
    // turns everyone has marched through (the last rank is 9 m back) aren't needed any more
    while (this.legs.length > 1 && this.s - 10 > this.legs[1].join) this.legs.shift();
    // home: the front rank is back on its spot (4 m before the end of the way home)
    const last = this.legs[this.legs.length - 1];
    if (this.state === "returning" && last && this.s >= last.join + last.path.length - 4) {
      this.state = "rest";
      this.legs = [];
      this.s = this.route.restAt;
    }
    this.place(dt);

    // near enough to talk to: by their block when at ease, or bumping into any of them on the march
    let nearest = Infinity;
    let cx = 0;
    let cz = 0;
    for (const m of this.members) {
      nearest = Math.min(nearest, Math.hypot(m.x - game.x, m.z - game.z));
      cx += m.x / this.members.length;
      cz += m.z / this.members.length;
    }
    const still = this.state === "rest" || this.state === "gathering";
    const near = game.started && !game.paused && nearest < (still ? 4.5 : 3);
    game.audio.bandDistance(dt, Math.hypot(cx - game.x, cz - game.z));

    if (this.state !== game.band || near !== game.bandNear) {
      game.band = this.state;
      game.bandNear = near;
      game.emit({ type: "band", state: this.state, near });
    }
    this.pose(dt, t);
  }

  /** The drum major (1.6 m ahead of the front rank) turns off from right where he is. */
  private turn(make: (p: P, h: P) => { path: Path; loopAt: number | null }) {
    const join = this.s + 1.6;
    const [x, z, hx, hz] = this.at(join);
    this.legs.push({ join, ...make([x, z], [hx, hz]) });
  }

  /** A point and the way forward there, `s` metres along the band's way (out, round the loop, turns). */
  private at(s: number): [number, number, number, number] {
    const r = this.route;
    for (let i = this.legs.length - 1; i >= 0; i--) {
      const leg = this.legs[i];
      if (s < leg.join) continue;
      const along = s - leg.join;
      if (leg.loopAt === null || along < leg.path.length) return leg.path.at(along);
      return r.loop.at(along - leg.path.length + leg.loopAt, true);
    }
    if (s < r.entry.length) return r.entry.at(s);
    return r.loop.at(s - r.entry.length, true);
  }

  /** Everyone in their place in the block, wherever it has got to. */
  private place(dt: number) {
    for (const m of this.members) {
      const [px, pz, hx, hz] = this.at(this.s - m.back);
      // to the bandsman's left (+side) or right of the way they're going
      const x = px + hz * m.side;
      const z = pz - hx * m.side;
      const speed = dt > 0 ? Math.hypot(x - m.x, z - m.z) / dt : 0;
      const want = Math.atan2(hx, hz);
      m.x = x;
      m.z = z;
      m.heading = dt > 0 ? m.heading + angle(m.heading, want) * Math.min(dt * 8, 1) : want;
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

  dispose() {
    this.members.forEach((m) => m.person.dispose());
  }
}

const angle = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

type P = [number, number];

/** A path sampled every half metre or so, with the distance along it to each point. */
class Path {
  readonly cum: number[] = [0];
  readonly length: number;
  constructor(readonly pts: P[]) {
    for (let i = 1; i < pts.length; i++)
      this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.length = this.cum[this.cum.length - 1];
  }
  /** The point `s` metres along, and the way forward there (wrapping round if it's a loop). */
  at(s: number, loop = false): [number, number, number, number] {
    const [x, z] = this.point(s, loop);
    // the way forward from a metre either side, so it turns smoothly through the corners between points
    // (the ranks either side of the middle would otherwise jerk at each one)
    const [ax, az] = this.point(s - 0.6, loop);
    const [bx, bz] = this.point(s + 0.6, loop);
    const d = Math.hypot(bx - ax, bz - az) || 1;
    return [x, z, (bx - ax) / d, (bz - az) / d];
  }

  private point(s: number, loop: boolean): P {
    const { pts, cum, length } = this;
    if (loop) s = ((s % length) + length) % length;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const [ax, az] = pts[i - 1];
    const [bx, bz] = pts[i];
    const f = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return [ax + (bx - ax) * f, az + (bz - az) * f];
  }
}

const off = (p: P, v: P, k: number): P => [p[0] + v[0] * k, p[1] + v[1] * k];

const line = (out: P[], a: P, b: P) => {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.5));
  for (let i = 0; i < n; i++) out.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
};

/** A smooth turn from `a` (heading `da`) to `b` (arriving heading `db`). */
const curve = (out: P[], a: P, da: P, b: P, db: P) => {
  const h = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2.5;
  const c1 = off(a, da, h);
  const c2 = off(b, db, -h);
  for (let i = 0; i < 40; i++) {
    const t = i / 40;
    const u = 1 - t;
    out.push([
      u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0],
      u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1],
    ]);
  }
};

/** Half a circle round `c`, from offset `o` to the opposite side, bulging out along `f`. */
const wheel = (out: P[], c: P, o: P, f: P, r: number) => {
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI;
    out.push([c[0] + o[0] * Math.cos(a) + f[0] * r * Math.sin(a), c[1] + o[1] * Math.cos(a) + f[1] * r * Math.sin(a)]);
  }
};

/**
 * The band's ways: the parade loop (up Jocson Street from the convent end to the plaza corner on one side
 * of the street, a wheel round, and back down the other side), the way out from their spot beside the
 * church onto the loop, and the ways home from either end of the street.
 */
function buildRoute() {
  const jocson = roads
    .filter((r) => r.name === "Jocson Street")
    .flatMap((r) => {
      const out: P[] = [];
      for (let i = 0; i < r.points.length; i += 2) out.push([r.points[i], r.points[i + 1]]);
      return out;
    });
  // the stretch in front of the church: from beside the convent to the corner of the plaza
  const near = (x: number, z: number) =>
    jocson.reduce((best, p) => (Math.hypot(p[0] - x, p[1] - z) < Math.hypot(best[0] - x, best[1] - z) ? p : best));
  const a = near(18, -58);
  const b = near(36, -22);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u: P = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const l: P = [-u[1], u[0]]; // across the street
  const back: P = [-u[0], -u[1]];

  // the loop, starting where the way out joins it
  const lp: P[] = [];
  const start = off(a, l, -LANE);
  line(lp, start, off(b, l, -LANE));
  wheel(lp, b, off([0, 0], l, -LANE), u, LANE);
  line(lp, off(b, l, LANE), off(a, l, LANE));
  wheel(lp, a, off([0, 0], l, LANE), back, LANE);
  lp.push(start);
  const loop = new Path(lp);

  // their spot: the front rank at REST, facing out to the street (f), with "side" across it (x)
  const rest = toWorld(CHURCH, REST.lx, REST.lz);
  const f: P = [Math.sin(CHURCH.angle), Math.cos(CHURCH.angle)];
  const x: P = [Math.cos(CHURCH.angle), -Math.sin(CHURCH.angle)];
  const east: P = [-f[0], -f[1]];
  const behind = 12; // the whole block (the last rank is 9 m back) stands on the straight behind the spot

  // the way out: from behind their spot, through it, and round onto the street
  const ep: P[] = [];
  line(ep, off(rest, f, -behind), off(rest, f, 2));
  curve(ep, off(rest, f, 2), f, start, u);
  ep.push(start); // right onto the loop's first point, so they step straight on
  const entry = new Path(ep);

  // the ways home, from either end of the street: round toward the convent side, along past their spot a
  // few metres nearer the convent, a wheel at the far end, and back in along their own straight
  const lane = off(rest, x, -3.2);
  // (`onto`: how far out along their straight the way joins the parallel way in)
  const home = (from: P, heading: P, onto = 3, hp: P[] = []) => {
    curve(hp, from, heading, off(lane, f, onto), east);
    line(hp, off(lane, f, onto), off(lane, f, -behind));
    wheel(hp, off(off(rest, x, -1.6), f, -behind), off([0, 0], x, -1.6), east, 1.6);
    line(hp, off(rest, f, -behind), off(rest, f, 4));
    hp.push(off(rest, f, 4));
    return new Path(hp);
  };
  // The way home from wherever the drum major is when they're told to stop (heading `h`):
  //  - marching up toward the plaza: wheel round across the street and march back down the other side;
  //  - coming back down (or round the far turn): carry on down to the convent end;
  //  - at the convent end, or still on the way out: swing straight round toward their spot.
  const downStreet = off(a, l, LANE);
  const homeFrom = (p: P, h: P, onWayOut: boolean) => {
    const along = (p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1];
    const toward = h[0] * u[0] + h[1] * u[1];
    if (onWayOut && h[0] * f[0] + h[1] * f[1] > 0.5) {
      // still heading out from their spot: an about-turn, wheeling toward the convent side, and home
      const n: P = [-h[1], h[0]];
      const side: P = n[0] * -x[0] + n[1] * -x[1] > 0 ? n : [-n[0], -n[1]];
      const wp: P[] = [];
      wheel(wp, off(p, side, 1.6), off([0, 0], side, -1.6), h, 1.6);
      const q = off(p, side, 3.2);
      const out = (q[0] - rest[0]) * f[0] + (q[1] - rest[1]) * f[1];
      wp.push(q);
      return home(q, [-h[0], -h[1]], Math.min(3, out - 4), wp);
    }
    // off the street (on the way home past their spot, say): straight round to it
    const across = (p[0] - a[0]) * l[0] + (p[1] - a[1]) * l[1];
    if (onWayOut || along < 3 || Math.abs(across) > LANE + 2.5) return home(p, h);
    const prefix: P[] = [];
    if (toward > 0.3) {
      // the about-turn: a wheel across the street, centred between the two sides
      const side = (p[0] - a[0]) * l[0] + (p[1] - a[1]) * l[1]; // where across the street they are
      const r = (LANE - side) / 2;
      wheel(prefix, off(p, l, r), off([0, 0], l, -r), u, Math.max(r, 1));
      line(prefix, off(p, l, 2 * r), downStreet);
    } else line(prefix, p, downStreet);
    const rest2 = home(downStreet, back);
    return new Path([...prefix, ...rest2.pts]);
  };
  // Back onto the parade from wherever the drum major is: a smooth turn onto the near side of the street
  // a little way up from the convent end (a little further if he's already close to it).
  const rejoin = (p: P, h: P) => {
    let loopAt = 8;
    let [tx, tz, hx, hz] = loop.at(loopAt);
    if (Math.hypot(tx - p[0], tz - p[1]) < 8) [tx, tz, hx, hz] = loop.at((loopAt = 18));
    const pts: P[] = [];
    curve(pts, p, h, [tx, tz], [hx, hz]);
    pts.push([tx, tz]);
    return { path: new Path(pts), loopAt };
  };

  // the closed stretch: the street between the two turns, plus the turns and the width of the block
  const reach = LANE + COL_GAP + 1;
  const zone = {
    ax: a[0] - u[0] * reach,
    az: a[1] - u[1] * reach,
    bx: b[0] + u[0] * reach,
    bz: b[1] + u[1] * reach,
    r: LANE + COL_GAP + 1.4,
  };
  return { loop, entry, homeFrom, rejoin, restAt: behind, zone };
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
