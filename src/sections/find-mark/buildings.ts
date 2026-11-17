// Every ordinary building from the OpenStreetMap footprints, raised floor by floor: pastel concrete
// houses with jalousie windows, shops with roll-up shutters, old houses with a capiz-windowed wooden
// upper floor, hipped tin roofs in rust, teal and maroon, flat roofs with a parapet and a water tank.

import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2 } from "three";
import { rgb } from "./materials";
import { buildings, type Building } from "./molo-map";

export const FLOOR = 3.1;

const WALLS = [
  "#f3e7d0",
  "#efd9b4",
  "#f4cfa7",
  "#d6e6d2",
  "#d9e5ee",
  "#f6f1e6",
  "#f0dc95",
  "#e9bfa9",
  "#dccbe4",
  "#e8e0cf",
];
const ROOFS = ["#a8432f", "#7a2f2a", "#3e7f78", "#5d6f88", "#8d9195", "#b8603d", "#4f6b3a", "#9a3b3b"];

type V2 = [number, number];
type Win = [number, number, number, number];

class Mesh {
  pos: number[] = [];
  nor: number[] = [];
  col: number[] = [];
  win: number[] = [];
  private push(p: number[], n: number[], c: number[], w: Win) {
    this.pos.push(...p);
    this.nor.push(...n);
    this.col.push(...c);
    this.win.push(...w);
  }
  /** A triangle with its face normal worked out (and the winding fixed to face `want`, if given). */
  tri(a: number[], b: number[], c: number[], color: number[], wa: Win, wb = wa, wc = wa, want?: number[]) {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    if (want && nx * want[0] + ny * want[1] + nz * want[2] < 0) {
      [b, c] = [c, b];
      [wb, wc] = [wc, wb];
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    const n = [nx / l, ny / l, nz / l];
    this.push(a, n, color, wa);
    this.push(b, n, color, wb);
    this.push(c, n, color, wc);
  }
  quad(a: number[], b: number[], c: number[], d: number[], color: number[], w: [Win, Win, Win, Win], want: number[]) {
    this.tri(a, b, c, color, w[0], w[1], w[2], want);
    this.tri(a, c, d, color, w[0], w[2], w[3], want);
  }
  geometry() {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new Float32BufferAttribute(this.nor, 3));
    g.setAttribute("color", new Float32BufferAttribute(this.col, 3));
    g.setAttribute("aWin", new Float32BufferAttribute(this.win, 4));
    return g;
  }
}

const NONE: Win = [0, 0, 0, 0];

function ring(pts: number[]): V2[] {
  const r: V2[] = [];
  for (let i = 0; i < pts.length; i += 2) r.push([pts[i], pts[i + 1]]);
  return r;
}
function signedArea(r: V2[]) {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, z1] = r[i];
    const [x2, z2] = r[(i + 1) % r.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

/** The smallest rectangle around a footprint, lined up with one of its walls. */
export function orientedBox(r: V2[]) {
  let best = { area: Infinity, cx: 0, cz: 0, ux: 1, uz: 0, a: 0, b: 0 };
  for (let i = 0; i < r.length; i++) {
    const [x1, z1] = r[i];
    const [x2, z2] = r[(i + 1) % r.length];
    const l = Math.hypot(x2 - x1, z2 - z1);
    if (l < 0.5) continue;
    const ux = (x2 - x1) / l;
    const uz = (z2 - z1) / l;
    let u0 = Infinity;
    let u1 = -Infinity;
    let v0 = Infinity;
    let v1 = -Infinity;
    for (const [x, z] of r) {
      const u = x * ux + z * uz;
      const v = -x * uz + z * ux;
      u0 = Math.min(u0, u);
      u1 = Math.max(u1, u);
      v0 = Math.min(v0, v);
      v1 = Math.max(v1, v);
    }
    const area = (u1 - u0) * (v1 - v0);
    if (area < best.area) {
      const cu = (u0 + u1) / 2;
      const cv = (v0 + v1) / 2;
      best = { area, cx: cu * ux - cv * uz, cz: cu * uz + cv * ux, ux, uz, a: (u1 - u0) / 2, b: (v1 - v0) / 2 };
    }
  }
  // make `u` the long side
  if (best.b > best.a) best = { ...best, ux: -best.uz, uz: best.ux, a: best.b, b: best.a };
  return best;
}

/** A hipped roof over a rectangle: two sloping trapezoids and two triangular ends, plus the eaves underneath. */
export function hipRoof(
  m: RoofTarget,
  box: ReturnType<typeof orientedBox>,
  y0: number,
  overhang: number,
  pitch: number,
  color: number[],
) {
  const A = box.a + overhang;
  const B = box.b + overhang;
  const H = B * pitch;
  const R = Math.max(box.a - box.b, 0);
  const P = (u: number, v: number, y: number) => [
    box.cx + box.ux * u - box.uz * v,
    y,
    box.cz + box.uz * u + box.ux * v,
  ];
  const up = [0, 1, 0];
  const c00 = P(-A, -B, y0);
  const c10 = P(A, -B, y0);
  const c11 = P(A, B, y0);
  const c01 = P(-A, B, y0);
  const r0 = P(-R, 0, y0 + H);
  const r1 = P(R, 0, y0 + H);
  const dark = color.map((v) => v * 0.82);
  m.quad(c00, c10, r1, r0, color, [NONE, NONE, NONE, NONE], up);
  m.quad(c11, c01, r0, r1, color, [NONE, NONE, NONE, NONE], up);
  m.tri(c10, c11, r1, dark, NONE, NONE, NONE, up);
  m.tri(c01, c00, r0, dark, NONE, NONE, NONE, up);
  // soffit, seen from the street
  m.quad(c00, c10, c11, c01, [0.86, 0.82, 0.75], [NONE, NONE, NONE, NONE], [0, -1, 0]);
}
type RoofTarget = Pick<Mesh, "quad" | "tri">;

function addBuilding(m: Mesh, b: Building, extras: Extras) {
  let r = ring(b.points);
  if (r.length < 3) return;
  if (signedArea(r) < 0) r = r.reverse(); // counter-clockwise (in x/z), so outward is to the right of each wall
  const s = b.seed;
  const pick = <T>(arr: T[], k: number) => arr[Math.floor(((s * 997 + k * 0.618) % 1) * arr.length)];
  const floors = b.levels;
  const box = orientedBox(r);
  const rect = Math.abs(signedArea(r)) / (box.a * box.b * 4);

  let wall = pick(WALLS, 1);
  let roof = pick(ROOFS, 2);
  let upperWall = wall;
  let styles: (floor: number) => number = () => 1;
  let hip = rect > 0.86 && box.a * box.b * 4 < 900;

  switch (b.kind) {
    case "shop":
      wall = pick(["#f4efe4", "#efe3cc", "#e7eef0", "#f3d9b0", "#dfe9d8"], 3);
      upperWall = wall;
      styles = (f) => (f === 0 ? 2 : 3);
      hip = hip && s < 0.35;
      break;
    case "civic":
      wall = s < 0.5 ? "#f6f2e8" : "#efe6d2";
      upperWall = wall;
      styles = () => 3;
      hip = false;
      break;
    case "heritage":
      wall = "#e6d8bc"; // coral stone below
      upperWall = "#8f5f3f"; // hardwood above
      roof = "#7f2e2a";
      styles = (f) => (f === 0 ? 1 : 4);
      hip = true;
      break;
    case "chapel":
      wall = "#f7f3ea";
      upperWall = wall;
      roof = "#a53a2e";
      styles = () => 5;
      hip = true;
      break;
    case "canopy": {
      // a filling-station canopy on four posts
      const top = 4.8;
      const white = rgb("#f2f2ee");
      for (let i = 0; i < r.length; i++) {
        const [x, z] = r[i];
        extras.posts.push([x, z]);
        const [x2, z2] = r[(i + 1) % r.length];
        const nx = z2 - z;
        const nz = -(x2 - x);
        const l = Math.hypot(nx, nz) || 1;
        const out = [nx / l, 0, nz / l];
        m.quad(
          [x, top, z],
          [x2, top, z2],
          [x2, top + 0.7, z2],
          [x, top + 0.7, z],
          white,
          [NONE, NONE, NONE, NONE],
          out,
        );
      }
      flatCap(m, r, top + 0.7, rgb("#cfd2d4"), [0, 1, 0]);
      flatCap(m, r, top, rgb("#e9eaea"), [0, -1, 0]);
      return;
    }
    default:
      if (floors >= 2 && s < 0.22) {
        upperWall = pick(["#9a6b47", "#7f5a3d", "#b0815a"], 4); // old wooden upper storey
        styles = (f) => (f === 0 ? 1 : 4);
      }
  }

  const height = floors * FLOOR;
  const parapet = hip ? 0 : 0.8;
  for (let i = 0; i < r.length; i++) {
    const [x1, z1] = r[i];
    const [x2, z2] = r[(i + 1) % r.length];
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.05) continue;
    const out = [(z2 - z1) / len, 0, -(x2 - x1) / len];
    for (let f = 0; f < floors; f++) {
      const y0 = f * FLOOR;
      const y1 = y0 + FLOOR;
      const c = rgb(f === 0 ? wall : upperWall);
      const st = styles(f);
      m.quad(
        [x1, y0, z1],
        [x2, y0, z2],
        [x2, y1, z2],
        [x1, y1, z1],
        c,
        [
          [0, 0, len, st],
          [len, 0, len, st],
          [len, FLOOR, len, st],
          [0, FLOOR, len, st],
        ],
        out,
      );
    }
    if (parapet) {
      const c = rgb(upperWall).map((v) => v * 0.97);
      m.quad(
        [x1, height, z1],
        [x2, height, z2],
        [x2, height + parapet, z2],
        [x1, height + parapet, z1],
        c,
        [NONE, NONE, NONE, NONE],
        out,
      );
    }
  }

  if (hip) {
    hipRoof(m, box, height, 0.45, b.kind === "chapel" || b.kind === "heritage" ? 0.62 : 0.42, rgb(roof));
  } else {
    flatCap(m, r, height + 0.05, rgb(s < 0.5 ? "#bdb6aa" : "#c9c2b5"), [0, 1, 0]);
    if (s > 0.55 && box.a > 2.5 && box.b > 2) {
      // a water tank up on the roof
      const along = (s - 0.55) * 4 - 0.9;
      extras.tanks.push([box.cx + box.ux * along * box.a * 0.5, height, box.cz + box.uz * along * box.a * 0.5, s]);
    }
  }
  extras.footprints.push({ points: b.points, height: height + (hip ? box.b * 0.42 : parapet) });
}

function flatCap(m: Mesh, r: V2[], y: number, color: number[], want: number[]) {
  const contour = r.map(([x, z]) => new Vector2(x, z));
  for (const [i, j, k] of ShapeUtils.triangulateShape(contour, [])) {
    m.tri([r[i][0], y, r[i][1]], [r[j][0], y, r[j][1]], [r[k][0], y, r[k][1]], color, NONE, NONE, NONE, want);
  }
}

type Extras = {
  posts: V2[];
  /** x, roof height, z, seed */
  tanks: [number, number, number, number][];
  footprints: { points: number[]; height: number }[];
};

/** Builds all the ordinary buildings as one mesh, and lists their footprints for collisions. */
export function buildBuildings() {
  const m = new Mesh();
  const extras: Extras = { posts: [], tanks: [], footprints: [] };
  for (const b of buildings) addBuilding(m, b, extras);
  return { geometry: m.geometry(), ...extras };
}
