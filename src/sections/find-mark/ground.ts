// The ground of the map, as one mesh: earth, lawns, the plaza's brick and stone paving, the churchyard,
// the mansion's lawns, and every street from the OpenStreetMap data, with lane lines and zebra crossings.

import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2 } from "three";
import { rgb } from "./materials";
import { areas, crossings, paths, roads, type AreaKind } from "./molo-map";

type Style = { color: string; pattern: number; y: number };

// Layer heights keep overlapping shapes from flickering: later layers sit a couple of centimetres higher.
const AREA_STYLE: Partial<Record<AreaKind, Style>> = {
  "mansion-grounds": { color: "#8db35a", pattern: 3, y: 0.02 },
  parking: { color: "#b1aca2", pattern: 0, y: 0.022 },
  plaza: { color: "#e3d7c1", pattern: 2, y: 0.026 },
  churchyard: { color: "#e0d6c4", pattern: 2, y: 0.026 },
  paving: { color: "#c98e66", pattern: 1, y: 0.05 },
  grass: { color: "#80ad4e", pattern: 3, y: 0.056 },
  grove: { color: "#6f9b46", pattern: 3, y: 0.06 },
  garden: { color: "#72a24a", pattern: 3, y: 0.062 },
  playground: { color: "#dcbb84", pattern: 6, y: 0.064 },
  fitness: { color: "#d2b78c", pattern: 6, y: 0.064 },
};

// The one-way streets that loop around the plaza (drawn with lane lines instead of a centre line).
const ONE_WAY = new Set(["Lopez Jaena Street", "San Pedro Street", "Marcelo H. del Pilar Street", "Jocson Street"]);

class Builder {
  pos: number[] = [];
  col: number[] = [];
  gnd: number[] = [];
  vert(x: number, y: number, z: number, c: [number, number, number], g: [number, number, number, number]) {
    this.pos.push(x, y, z);
    this.col.push(...c);
    this.gnd.push(...g);
  }
  /** A triangle, flipped if needed so it faces up. */
  tri(
    a: [number, number],
    b: [number, number],
    c: [number, number],
    y: number,
    color: [number, number, number],
    ga: [number, number, number, number],
    gb = ga,
    gc = ga,
  ) {
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (cross > 0) {
      // counter-clockwise in x/z seen from above faces down in three.js (z points south); swap
      this.vert(a[0], y, a[1], color, ga);
      this.vert(c[0], y, c[1], color, gc);
      this.vert(b[0], y, b[1], color, gb);
    } else {
      this.vert(a[0], y, a[1], color, ga);
      this.vert(b[0], y, b[1], color, gb);
      this.vert(c[0], y, c[1], color, gc);
    }
  }
  geometry() {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.pos, 3));
    g.setAttribute("color", new Float32BufferAttribute(this.col, 3));
    g.setAttribute("aGround", new Float32BufferAttribute(this.gnd, 4));
    const n = this.pos.length / 3;
    const normals = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) normals[i * 3 + 1] = 1;
    g.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    return g;
  }
}

function polygon(b: Builder, pts: number[], y: number, color: string, pattern: number) {
  const contour: Vector2[] = [];
  for (let i = 0; i < pts.length; i += 2) contour.push(new Vector2(pts[i], pts[i + 1]));
  const faces = ShapeUtils.triangulateShape(contour, []);
  const c = rgb(color);
  for (const [i, j, k] of faces) {
    const g: [number, number, number, number] = [0, 0, pattern, 0];
    b.tri([contour[i].x, contour[i].y], [contour[j].x, contour[j].y], [contour[k].x, contour[k].y], y, c, g);
  }
}

/** A flat strip along a line, `width` wide, with u (metres along) and v (−1…1 across) for the shader. */
function ribbon(b: Builder, pts: number[], width: number, y: number, color: string, pattern: number, marks: number) {
  const n = pts.length / 2;
  if (n < 2) return;
  const hw = width / 2;
  const c = rgb(color);
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  const u: number[] = [];
  let run = 0;
  for (let i = 0; i < n; i++) {
    const x = pts[i * 2];
    const z = pts[i * 2 + 1];
    if (i > 0) run += Math.hypot(x - pts[i * 2 - 2], z - pts[i * 2 - 1]);
    u.push(run);
    // average the directions of the segments either side, and lengthen the offset at sharp bends
    const px = i > 0 ? pts[i * 2 - 2] : x;
    const pz = i > 0 ? pts[i * 2 - 1] : z;
    const nx = i < n - 1 ? pts[i * 2 + 2] : x;
    const nz = i < n - 1 ? pts[i * 2 + 3] : z;
    let d1x = x - px;
    let d1z = z - pz;
    let d2x = nx - x;
    let d2z = nz - z;
    const l1 = Math.hypot(d1x, d1z) || 1;
    const l2 = Math.hypot(d2x, d2z) || 1;
    d1x /= l1;
    d1z /= l1;
    d2x /= l2;
    d2z /= l2;
    if (i === 0) [d1x, d1z] = [d2x, d2z];
    if (i === n - 1) [d2x, d2z] = [d1x, d1z];
    let tx = d1x + d2x;
    let tz = d1z + d2z;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    const miter = Math.min(1 / Math.max(tx * d2x + tz * d2z, 0.35), 2.5);
    const ox = -tz * hw * miter;
    const oz = tx * hw * miter;
    left.push([x + ox, z + oz]);
    right.push([x - ox, z - oz]);
  }
  for (let i = 0; i < n - 1; i++) {
    const gl0: [number, number, number, number] = [u[i], 1, pattern, marks];
    const gr0: [number, number, number, number] = [u[i], -1, pattern, marks];
    const gl1: [number, number, number, number] = [u[i + 1], 1, pattern, marks];
    const gr1: [number, number, number, number] = [u[i + 1], -1, pattern, marks];
    b.tri(left[i], right[i], right[i + 1], y, c, gl0, gr0, gr1);
    b.tri(left[i], right[i + 1], left[i + 1], y, c, gl0, gr1, gl1);
  }
  // round caps fill the corners where streets meet
  for (const [i, end] of [
    [0, 0],
    [n - 1, 1],
  ]) {
    const cx = pts[i * 2];
    const cz = pts[i * 2 + 1];
    const seg = 14;
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * Math.PI * 2;
      const a1 = ((k + 1) / seg) * Math.PI * 2;
      const g: [number, number, number, number] = [u[end ? n - 1 : 0], 0, pattern, 0];
      b.tri(
        [cx, cz],
        [cx + Math.cos(a0) * hw, cz + Math.sin(a0) * hw],
        [cx + Math.cos(a1) * hw, cz + Math.sin(a1) * hw],
        y - 0.002,
        c,
        g,
        [g[0], 0.8, pattern, 0],
        [g[0], 0.8, pattern, 0],
      );
    }
  }
}

/** The nearest street to a point: its direction there, its width, and how far away it is. */
export function nearestRoad(x: number, z: number) {
  let best = { d: Infinity, dx: 1, dz: 0, width: 6, px: x, pz: z, name: "" };
  for (const r of roads) {
    const p = r.points;
    for (let i = 0; i < p.length - 2; i += 2) {
      const ax = p[i];
      const az = p[i + 1];
      const bx = p[i + 2];
      const bz = p[i + 3];
      const vx = bx - ax;
      const vz = bz - az;
      const len2 = vx * vx + vz * vz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / len2));
      const qx = ax + vx * t;
      const qz = az + vz * t;
      const d = Math.hypot(x - qx, z - qz);
      if (d < best.d) {
        const l = Math.sqrt(len2);
        best = { d, dx: vx / l, dz: vz / l, width: r.width, px: qx, pz: qz, name: r.name ?? "" };
      }
    }
  }
  return best;
}

export function buildGround() {
  const b = new Builder();

  // earth and dust out to the horizon
  const R = 900;
  const seg = 48;
  for (let k = 0; k < seg; k++) {
    const a0 = (k / seg) * Math.PI * 2;
    const a1 = ((k + 1) / seg) * Math.PI * 2;
    b.tri(
      [0, 0],
      [Math.cos(a0) * R, Math.sin(a0) * R],
      [Math.cos(a1) * R, Math.sin(a1) * R],
      0,
      rgb("#d6c6a6"),
      [0, 0, 0, 0],
    );
  }

  for (const a of areas) {
    const style = AREA_STYLE[a.kind];
    if (style) polygon(b, a.points, style.y, style.color, style.pattern);
  }

  for (const r of roads) {
    const main = ["primary", "secondary", "tertiary"].includes(r.kind);
    const color = main ? "#6d6f74" : r.kind === "service" ? "#a9a49b" : "#b6b0a5";
    const marks = !main ? 0 : ONE_WAY.has(r.name ?? "") ? (r.width >= 9 ? 2 : 0) : 1;
    ribbon(b, r.points, r.width, main ? 0.045 : 0.04, color, 4, marks);
  }

  // the plaza's walks and the pavements
  for (const p of paths) ribbon(b, p, 2.4, 0.07, "#e8dcc6", 2, 0);

  // zebra crossings: white bars running with the traffic, side by side across the street
  for (let i = 0; i < crossings.length; i += 2) {
    const x = crossings[i];
    const z = crossings[i + 1];
    const r = nearestRoad(x, z);
    if (r.d > 3) continue;
    const nx = -r.dz;
    const nz = r.dx;
    const bars = Math.floor(r.width / 1.0);
    const white = rgb("#f2efe6");
    for (let k = 0; k < bars; k++) {
      const off = -r.width / 2 + 0.5 + (k * (r.width - 1)) / Math.max(bars - 1, 1);
      const cx = r.px + nx * off;
      const cz = r.pz + nz * off;
      const hl = 1.6;
      const hw = 0.28;
      const p0: [number, number] = [cx - r.dx * hl - nx * hw, cz - r.dz * hl - nz * hw];
      const p1: [number, number] = [cx + r.dx * hl - nx * hw, cz + r.dz * hl - nz * hw];
      const p2: [number, number] = [cx + r.dx * hl + nx * hw, cz + r.dz * hl + nz * hw];
      const p3: [number, number] = [cx - r.dx * hl + nx * hw, cz - r.dz * hl + nz * hw];
      b.tri(p0, p1, p2, 0.06, white, [0, 0, 0, 0]);
      b.tri(p0, p2, p3, 0.06, white, [0, 0, 0, 0]);
    }
  }

  return b.geometry();
}
