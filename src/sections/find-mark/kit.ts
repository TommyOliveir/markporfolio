// A small toolbox for building the hand-made models (the church, the mansion, the plaza's monuments,
// people, jeepneys) out of boxes, cylinders and cones, each painted one flat colour, then merged into a
// single mesh so a whole building is one draw call.

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const tmp = new Matrix4();
const q = new Quaternion();
const e = new Euler();
const v = new Vector3();
const s = new Vector3();

export type Place = {
  x?: number;
  y?: number;
  z?: number;
  /** Turn about the vertical axis (radians). */
  ry?: number;
  rx?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
};

export class Kit {
  private parts: BufferGeometry[] = [];

  /** Adds a shape painted one colour, placed and turned. The shape is consumed. */
  add(geo: BufferGeometry, color: string, at: Place = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    e.set(at.rx ?? 0, at.ry ?? 0, at.rz ?? 0, "YXZ");
    q.setFromEuler(e);
    v.set(at.x ?? 0, at.y ?? 0, at.z ?? 0);
    s.set(at.sx ?? 1, at.sy ?? 1, at.sz ?? 1);
    g.applyMatrix4(tmp.compose(v, q, s));
    const c = new Color(color);
    const n = g.getAttribute("position").count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new BufferAttribute(colors, 3));
    g = g as BufferGeometry;
    this.parts.push(g);
    return this;
  }

  /** A box sitting on `y` (its bottom face at y), centred on x/z. */
  box(w: number, h: number, d: number, color: string, at: Place = {}) {
    return this.add(new BoxGeometry(w, h, d).translate(0, h / 2, 0), color, at);
  }

  /** An upright cylinder sitting on `y`. */
  cyl(rTop: number, rBottom: number, h: number, color: string, at: Place = {}, segments = 12) {
    return this.add(new CylinderGeometry(rTop, rBottom, h, segments).translate(0, h / 2, 0), color, at);
  }

  ball(r: number, color: string, at: Place = {}, w = 12, hgt = 8) {
    return this.add(new SphereGeometry(r, w, hgt), color, at);
  }

  /** Adds everything from another kit, moved and turned as one. */
  merge(other: Kit, at: Place = {}) {
    const g = other.build();
    if (!g) return this;
    const colors = g.getAttribute("color").clone(); // `add` repaints, so keep the original colours
    this.add(g, "#ffffff", at);
    this.parts[this.parts.length - 1].setAttribute("color", colors);
    return this;
  }

  get empty() {
    return this.parts.length === 0;
  }

  /** Merges every part into one geometry (or null if nothing was added). */
  build(): BufferGeometry | null {
    if (!this.parts.length) return null;
    const g = mergeGeometries(this.parts);
    this.parts.forEach((p) => p.dispose());
    this.parts = [];
    return g;
  }
}

/** A flat polygon lying on y, from a closed flat [x0, z0, …] list, as a triangle fan-safe geometry. */
export function trianglesGeometry(positions: number[], colors?: number[]) {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  if (colors) g.setAttribute("color", new Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** A pointed (lancet) arch outline as a flat panel facing +z: w wide, h tall to the springing line. */
export function lancet(w: number, h: number, depth = 0.05) {
  const kit = new Kit();
  kit.box(w, h, depth, "#000");
  // the pointed head: two leaning boxes would gap, so use a flattened four-sided cone
  const head = new CylinderGeometry(0, w / Math.SQRT2, w * 0.75, 4, 1).rotateY(Math.PI / 4).scale(1, 1, depth / w);
  kit.add(head.translate(0, h + w * 0.375, 0), "#000");
  return kit.build()!;
}

/** A round-headed (Roman) arch panel facing +z: w wide, h tall to where the arch starts. */
export function roundArch(w: number, h: number, depth = 0.05) {
  const kit = new Kit();
  kit.box(w, h, depth, "#000");
  kit.add(
    new CylinderGeometry(w / 2, w / 2, depth, 16, 1, false, -Math.PI / 2, Math.PI)
      .rotateX(Math.PI / 2)
      .translate(0, h, 0),
    "#000",
  );
  return kit.build()!;
}

/** A row of balusters with a rail: `len` long along x, `h` tall, centred on x = 0. */
export function balustrade(kit: Kit, len: number, h: number, color: string, at: Place = {}) {
  const inner = new Kit();
  inner.box(len, 0.12, 0.3, color, { y: h - 0.12 });
  inner.box(len, 0.1, 0.26, color);
  const n = Math.max(2, Math.round(len / 0.32));
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + (i / n) * len;
    inner.cyl(0.05, 0.07, h - 0.22, color, { x, y: 0.1 }, 6);
  }
  kit.merge(inner, at);
}
