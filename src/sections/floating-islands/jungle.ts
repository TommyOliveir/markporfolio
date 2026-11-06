// Jungle growth for the rocks: leaf clumps, bushes, umbrella trees and hanging vines.

import {
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
} from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { seeded } from "@/lib/seeded";
import { noise3 } from "./noise";
import { type RockSpec } from "./rock";

export const greens = ["#1f4d22", "#2b5e27", "#356b2c", "#24502f", "#3f7431", "#1a4228", "#4a7d34"];

// One lumpy leaf-cluster shape, reused for every bush and canopy.
export function leafClump() {
  let geo: BufferGeometry = new IcosahedronGeometry(1, 1);
  geo.deleteAttribute("uv");
  geo.deleteAttribute("normal");
  geo = mergeVertices(geo);
  const pos = geo.getAttribute("position");
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(1 + 0.22 * noise3(v.x * 2.4, v.y * 2.4, v.z * 2.4));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

type Dressing = { size: number; bushes: number; edge: number; trees: number; vines: number };

// Covers a rock with jungle: bushes on the plateau, growth spilling over the rim,
// a few tall umbrella trees, and vines hanging off the cliffs.
export function dressRock(geo: BufferGeometry, spec: RockSpec, d: Dressing, rand: ReturnType<typeof seeded>) {
  const pos = geo.getAttribute("position");
  const nor = geo.getAttribute("normal");
  const yMin = spec.profile[0][1];
  const yMax = spec.profile[spec.profile.length - 1][1];
  const tops: number[] = [];
  const rims: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const h = (pos.getY(i) - yMin) / (yMax - yMin);
    const ny = nor.getY(i);
    if (ny > 0.6 && h > 0.85) tops.push(i);
    else if (h > 0.86 && ny > -0.2) rims.push(i); // just under the lip, so growth spills over the edge
  }
  const at = (i: number) => new Vector3().fromBufferAttribute(pos, i);
  const normal = (i: number) => new Vector3().fromBufferAttribute(nor, i);

  const clumps: { p: Vector3; s: Vector3 }[] = [];
  for (let n = 0; n < d.bushes && tops.length; n++) {
    const i = rand.pick(tops);
    const s = rand.range(0.05, 0.12) * d.size;
    clumps.push({ p: at(i).addScaledVector(normal(i), s * 0.45), s: new Vector3(s, s * 0.75, s) });
  }
  for (let n = 0; n < d.edge && rims.length; n++) {
    const i = rand.pick(rims);
    const s = rand.range(0.035, 0.085) * d.size;
    clumps.push({ p: at(i).addScaledVector(normal(i), s * 0.4), s: new Vector3(s, s * 0.8, s) });
  }

  const trunks: BufferGeometry[] = [];
  for (let n = 0; n < d.trees && tops.length; n++) {
    const base = at(rand.pick(tops));
    const height = rand.range(0.14, 0.28) * d.size;
    trunks.push(
      new CylinderGeometry(0.014 * d.size, 0.03 * d.size, height, 6).translate(base.x, base.y + height / 2, base.z),
    );
    const w = rand.range(0.22, 0.32) * d.size;
    for (let k = 0; k < 5; k++) {
      const a = rand.range(0, Math.PI * 2);
      const r = k === 0 ? 0 : rand.range(0.35, 0.7) * w;
      const cw = (k === 0 ? 0.7 : rand.range(0.4, 0.55)) * w;
      clumps.push({
        p: new Vector3(
          base.x + Math.cos(a) * r,
          base.y + height + rand.range(-0.1, 0.25) * w,
          base.z + Math.sin(a) * r,
        ),
        s: new Vector3(cw, cw * 0.5, cw),
      });
    }
  }

  const vines: BufferGeometry[] = [];
  const hanging = rims.filter((i) => Math.abs(nor.getY(i)) < 0.4);
  for (let n = 0; n < d.vines && hanging.length; n++) {
    const i = rand.pick(hanging);
    const start = at(i);
    const out = normal(i).setY(0).normalize();
    const length = rand.range(0.45, 1.5) * d.size;
    const sway = rand.range(-0.06, 0.06) * d.size;
    const curve = new CatmullRomCurve3([
      start,
      start
        .clone()
        .addScaledVector(out, 0.05 * d.size)
        .setY(start.y - 0.12 * d.size),
      start
        .clone()
        .addScaledVector(out, 0.08 * d.size)
        .add(new Vector3(sway, -length * 0.55, -sway)),
      start
        .clone()
        .addScaledVector(out, 0.09 * d.size)
        .add(new Vector3(-sway, -length, sway)),
    ]);
    vines.push(new TubeGeometry(curve, 18, rand.range(0.006, 0.011) * d.size, 4, false));
  }

  const foliage = new InstancedMesh(leafClump(), new MeshStandardMaterial({ roughness: 0.85 }), clumps.length);
  const o = new Object3D();
  const c = new Color();
  clumps.forEach((clump, i) => {
    o.position.copy(clump.p);
    o.scale.copy(clump.s);
    o.rotation.set(rand.range(-0.3, 0.3), rand.range(0, Math.PI * 2), rand.range(-0.3, 0.3));
    o.updateMatrix();
    foliage.setMatrixAt(i, o.matrix);
    foliage.setColorAt(i, c.set(rand.pick(greens)).offsetHSL(rand.range(-0.02, 0.02), 0, rand.range(-0.04, 0.05)));
  });
  foliage.castShadow = true;
  foliage.receiveShadow = true;

  return {
    foliage,
    trunks: trunks.length ? mergeGeometries(trunks) : null,
    vines: vines.length ? mergeGeometries(vines) : null,
    rims: hanging,
  };
}
