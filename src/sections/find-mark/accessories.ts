// Hats, bags, a backpack and an umbrella for the realistic townsfolk (see humans.ts). Smooth, lightly
// textured models in metres for a person about 1.75 m tall: y up, facing +z. Rig hangs hats on the head
// (origin = the top of the skull), the backpack on the upper back and the bag at the hip; the umbrella is
// held in the hand, in the same frame as a painted figure's arm (origin at the shoulder, hand at y = -0.6).

import {
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  FrontSide,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type Hat = "straw" | "beret" | "cap" | "shako";

type Paint = { color: string; roughness: number; metalness: number; map: Texture | null; double: boolean };

/**
 * One accessory: a group to hang on a figure, and everything it owns. Its parts are merged into one
 * mesh (two when it has metal or straw parts), coloured per vertex, so a hat costs one draw, not eight.
 */
export class Accessory {
  readonly group = new Group();
  private parts: { geometry: BufferGeometry; paint: Paint }[] = [];
  private owned: { dispose: () => void }[] = [];

  add(geometry: BufferGeometry, paint: Paint, at: Partial<Record<"x" | "y" | "z" | "rx" | "ry" | "rz", number>> = {}) {
    const m = new Matrix4().compose(
      new Vector3(at.x ?? 0, at.y ?? 0, at.z ?? 0),
      new Quaternion().setFromEuler(new Euler(at.rx ?? 0, at.ry ?? 0, at.rz ?? 0)),
      new Vector3(1, 1, 1),
    );
    const g = (geometry.index ? geometry.toNonIndexed() : geometry).applyMatrix4(m);
    if (g !== geometry) geometry.dispose();
    for (const name of Object.keys(g.attributes))
      if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
    this.parts.push({ geometry: g, paint });
  }

  material(
    color: string,
    roughness = 0.85,
    extra: { map?: Texture; metalness?: number; side?: typeof DoubleSide } = {},
  ): Paint {
    return {
      color,
      roughness,
      metalness: extra.metalness ?? 0,
      map: extra.map ?? null,
      double: extra.side === DoubleSide,
    };
  }

  /** Merges the parts: one mesh for each kind of surface (plain, metal, textured). */
  finish() {
    const groups = new Map<string, { geometry: BufferGeometry; paint: Paint }[]>();
    for (const p of this.parts) {
      const key = p.paint.map ? p.paint.map.uuid : p.paint.metalness > 0.4 ? "metal" : "plain";
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    for (const parts of groups.values()) {
      const c = new MeshStandardMaterial().color;
      for (const p of parts) {
        c.set(p.paint.color);
        const colors = new Float32Array(p.geometry.attributes.position.count * 3);
        for (let i = 0; i < colors.length; i += 3) colors.set([c.r, c.g, c.b], i);
        p.geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
      }
      const geometry = mergeGeometries(parts.map((p) => p.geometry))!;
      parts.forEach((p) => p.geometry.dispose());
      const first = parts[0].paint;
      const material = new MeshStandardMaterial({
        vertexColors: true,
        roughness: parts.reduce((s, p) => s + p.paint.roughness, 0) / parts.length,
        metalness: first.metalness,
        map: first.map,
        side: parts.some((p) => p.paint.double) ? DoubleSide : FrontSide,
      });
      const mesh = new Mesh(geometry, material);
      mesh.castShadow = true;
      this.group.add(mesh);
      this.owned.push(geometry, material);
    }
    this.parts = [];
    return this;
  }

  dispose() {
    this.owned.forEach((o) => o.dispose());
  }
}

/** A woven look for straw: a fine basket weave drawn once and shared. */
let weave: CanvasTexture | null = null;
function strawWeave() {
  if (weave) return weave;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#e9d19a";
  g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 4)
    for (let x = 0; x < 64; x += 8) {
      const odd = (y / 4) % 2;
      g.fillStyle = (x / 8 + y / 4) % 3 === 0 ? "#c9a660" : "#d8b878";
      g.fillRect(x + odd * 4, y, 4, 3);
    }
  weave = new CanvasTexture(c);
  weave.colorSpace = SRGBColorSpace;
  weave.wrapS = weave.wrapT = RepeatWrapping;
  weave.repeat.set(6, 2);
  return weave;
}

const lathe = (points: [number, number][], segments = 40) =>
  new LatheGeometry(
    points.map(([r, y]) => new Vector2(r, y)),
    segments,
  );

export function hat(kind: Hat, color: string, plume?: string) {
  const a = new Accessory();
  switch (kind) {
    case "straw": {
      const straw = a.material("#ffffff", 0.92, { map: strawWeave(), side: DoubleSide });
      // a low crown and a wide brim that dips a little at the edge
      a.add(
        lathe([
          [0.001, 0.06],
          [0.07, 0.058],
          [0.093, 0.035],
          [0.1, -0.03],
          [0.101, -0.045],
        ]),
        straw,
      );
      a.add(
        lathe([
          [0.1, -0.045],
          [0.16, -0.052],
          [0.205, -0.066],
          [0.212, -0.072],
        ]),
        straw,
      );
      a.add(
        new CylinderGeometry(0.1015, 0.1025, 0.018, 40, 1, true),
        a.material("#b92a4f", 0.7, { side: DoubleSide }),
        {
          y: -0.035,
        },
      );
      break;
    }
    case "beret": {
      const felt = a.material(color, 0.97);
      a.add(new SphereGeometry(0.122, 32, 16).scale(1, 0.3, 1.02), felt, { x: 0.018, y: -0.004, rz: -0.18 });
      a.add(new TorusGeometry(0.092, 0.009, 8, 40).rotateX(Math.PI / 2), felt, { y: -0.03 });
      a.add(new CylinderGeometry(0.004, 0.007, 0.022, 8), felt, { x: 0.01, y: 0.03 });
      break;
    }
    case "cap": {
      const cloth = a.material(color, 0.88);
      a.add(new SphereGeometry(0.102, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.78, 1.08), cloth, {
        y: -0.05,
      });
      // the peak, out over the eyes, curved a little
      const peak = new CylinderGeometry(0.095, 0.095, 0.007, 32, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, 0.82);
      a.add(peak, cloth, { y: -0.052, z: 0.05, rx: 0.12 });
      a.add(new SphereGeometry(0.008, 10, 6), cloth, { y: 0.03 });
      break;
    }
    case "shako": {
      // a marching band's tall hat: crown, black peak, gold bands and badge, and a plume
      const body = a.material(color, 0.6);
      const gold = a.material("#d8b24a", 0.35, { metalness: 0.8 });
      const black = a.material("#121212", 0.25);
      a.add(new CylinderGeometry(0.108, 0.098, 0.2, 32), body, { y: 0.055 });
      a.add(new CylinderGeometry(0.109, 0.109, 0.004, 32), black, { y: 0.157 });
      a.add(new TorusGeometry(0.099, 0.006, 8, 40).rotateX(Math.PI / 2), gold, { y: -0.035 });
      a.add(new TorusGeometry(0.108, 0.006, 8, 40).rotateX(Math.PI / 2), gold, { y: 0.15 });
      a.add(new CylinderGeometry(0.095, 0.095, 0.007, 32, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, 0.75), black, {
        y: -0.045,
        z: 0.045,
        rx: 0.28,
      });
      a.add(new SphereGeometry(0.026, 16, 10).scale(1, 1.2, 0.35), gold, { y: 0.06, z: 0.104 });
      const feather = a.material(plume ?? "#c8102e", 0.9);
      a.add(new SphereGeometry(0.03, 14, 10).scale(1, 3.2, 1), feather, { y: 0.25 });
      a.add(new ConeGeometry(0.012, 0.05, 8), gold, { y: 0.17 });
      break;
    }
  }
  return a.finish();
}

export function backpack(color: string) {
  const a = new Accessory();
  const canvas = a.material(color, 0.8);
  const trim = a.material("#2a2a2a", 0.7);
  a.add(new RoundedBoxGeometry(0.3, 0.38, 0.15, 4, 0.045), canvas, { y: -0.14, z: -0.075 });
  a.add(new RoundedBoxGeometry(0.22, 0.14, 0.05, 3, 0.02), canvas, { y: -0.22, z: -0.165 });
  a.add(new RoundedBoxGeometry(0.2, 0.012, 0.012, 1, 0.005), trim, { y: -0.15, z: -0.19 });
  // the tops of the shoulder straps
  for (const x of [-0.08, 0.08])
    a.add(new RoundedBoxGeometry(0.05, 0.02, 0.16, 2, 0.008), trim, { x, y: 0.035, z: 0.0 });
  return a.finish();
}

export function bag(color: string) {
  const a = new Accessory();
  const cloth = a.material(color, 0.85);
  a.add(new RoundedBoxGeometry(0.07, 0.3, 0.27, 3, 0.02), cloth, { y: -0.2 });
  a.add(new TorusGeometry(0.11, 0.008, 6, 24, Math.PI).rotateY(Math.PI / 2), cloth, { y: -0.05 });
  return a.finish();
}

export function umbrella(color: string) {
  const a = new Accessory();
  const cloth = a.material(color, 0.75, { side: DoubleSide });
  const metal = a.material("#3a3530", 0.4, { metalness: 0.6 });
  a.add(new CylinderGeometry(0.007, 0.007, 1.25, 8), metal, { y: -0.02, z: 0.05 });
  a.add(new TorusGeometry(0.035, 0.008, 6, 14, Math.PI), metal, { x: 0.035, y: -0.645, z: 0.05, rz: Math.PI });
  a.add(new ConeGeometry(0.52, 0.2, 16, 1, true), cloth, { y: 0.62, z: 0.05 });
  a.add(new SphereGeometry(0.012, 8, 6), metal, { y: 0.73, z: 0.05 });
  return a.finish();
}
