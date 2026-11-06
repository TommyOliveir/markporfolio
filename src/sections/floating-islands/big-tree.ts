// The big old tree on its own rock.

import {
  CatmullRomCurve3,
  Color,
  InstancedMesh,
  LatheGeometry,
  MeshStandardMaterial,
  Object3D,
  SplineCurve,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { seeded } from "@/lib/seeded";
import { greens, leafClump } from "./jungle";
import { noise3 } from "./noise";
import { paint } from "./paint";

// An old giant: a gnarled, flared trunk with roots gripping the rock, wide branches,
// a broad layered canopy, and thin aerial roots hanging from the boughs. `base` is the ground height.
export function buildTree(rand: ReturnType<typeof seeded>, base: number) {
  const height = 0.8;
  const wood: BufferGeometry[] = [];

  const outline = new SplineCurve(
    [
      [0.2, 0],
      [0.115, 0.05],
      [0.082, 0.16],
      [0.07, 0.36],
      [0.062, 0.56],
      [0.05, height],
    ].map(([r, y]) => new Vector2(r, y)),
  ).getPoints(36);
  const trunk = new LatheGeometry(outline, 28);
  const pos = trunk.getAttribute("position");
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + 0.2 * noise3(v.x * 18, v.y * 5, v.z * 18); // deep bark furrows
    pos.setXYZ(i, v.x * k + Math.sin(v.y * 5) * 0.025, v.y + base, v.z * k);
  }
  trunk.computeVertexNormals();
  wood.push(paint(trunk, "#5b4532"));

  const limb = (points: Vector3[], radius: number, color: string) =>
    wood.push(paint(new TubeGeometry(new CatmullRomCurve3(points), 14, radius, 6, false), color));

  // roots flaring out over the ground
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rand.range(-0.3, 0.3);
    const reach = rand.range(0.24, 0.34);
    const at = (r: number, y: number) => new Vector3(Math.cos(a) * r, base + y, Math.sin(a) * r);
    limb([at(0.05, 0.07), at(0.14, 0.01), at(reach, -0.03)], rand.range(0.014, 0.022), "#56402e");
  }

  // spreading branches, each ending in a cluster of leaves
  const tips: Vector3[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand.range(-0.25, 0.25);
    const y0 = base + rand.range(0.4, 0.7);
    const reach = rand.range(0.34, 0.52);
    const rise = rand.range(0.1, 0.22);
    const end = new Vector3(Math.cos(a) * reach, y0 + rise, Math.sin(a) * reach);
    const mid = new Vector3(Math.cos(a) * reach * 0.45, y0 + rise * 0.6, Math.sin(a) * reach * 0.45);
    limb([new Vector3(0, y0, 0), mid, end], rand.range(0.014, 0.022), "#5b4532");
    tips.push(end, mid);
  }

  // aerial roots dangling from the boughs
  for (let i = 0; i < 14; i++) {
    const from = rand.pick(tips);
    const drop = rand.range(0.3, 0.6);
    limb(
      [from, from.clone().add(new Vector3(rand.range(-0.02, 0.02), -drop * 0.5, 0)), from.clone().setY(from.y - drop)],
      0.004,
      "#4a3a2a",
    );
  }

  // canopy: clumps around every branch tip, plus a crown over the top
  const clumps: { p: Vector3; s: number }[] = [];
  tips.forEach((t, i) => {
    for (let k = 0; k < (i % 2 ? 2 : 6); k++) {
      clumps.push({
        p: t.clone().add(new Vector3(rand.range(-0.12, 0.12), rand.range(0, 0.07), rand.range(-0.12, 0.12))),
        s: rand.range(0.08, 0.14),
      });
    }
  });
  for (let k = 0; k < 18; k++) {
    const a = rand.range(0, Math.PI * 2);
    const r = rand.range(0, 0.3);
    clumps.push({
      p: new Vector3(Math.cos(a) * r, base + height + rand.range(0, 0.08), Math.sin(a) * r),
      s: rand.range(0.1, 0.15),
    });
  }
  const canopy = new InstancedMesh(leafClump(), new MeshStandardMaterial({ roughness: 0.85 }), clumps.length);
  const o = new Object3D();
  const c = new Color();
  clumps.forEach((clump, i) => {
    o.position.copy(clump.p);
    o.scale.set(clump.s, clump.s * 0.55, clump.s); // flattened, layered crowns
    o.rotation.set(0, rand.range(0, Math.PI * 2), 0);
    o.updateMatrix();
    canopy.setMatrixAt(i, o.matrix);
    canopy.setColorAt(i, c.set(rand.pick(greens)).offsetHSL(0, 0, rand.range(-0.03, 0.06)));
  });
  canopy.castShadow = true;
  canopy.receiveShadow = true;

  return { wood: mergeGeometries(wood), canopy };
}
