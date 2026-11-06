// The giant floating strawberry.

import {
  BufferAttribute,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  DoubleSide,
  InstancedMesh,
  LatheGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  SplineCurve,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { mix, noise3, smooth } from "./noise";

// A giant strawberry drifting with the islands: a glossy, slightly lumpy body (widest at the
// shoulders, pale under the leaves, deep red at the tip), golden seeds set in little dimples
// all over it, a frill of green leaves on top and a curled stem.
export function buildStrawberry() {
  const profile = new SplineCurve(
    [
      [0.0, -0.45],
      [0.12, -0.38],
      [0.24, -0.22],
      [0.31, -0.02],
      [0.33, 0.14],
      [0.29, 0.27],
      [0.16, 0.33],
      [0.0, 0.34],
    ].map(([r, y]) => new Vector2(r, y)),
  ).getPoints(48);
  const radiusAt = (y: number) => {
    for (let i = 1; i < profile.length; i++) {
      const a = profile[i - 1];
      const b = profile[i];
      if ((y - a.y) * (y - b.y) <= 0) return mix(a.x, b.x, (y - a.y) / (b.y - a.y || 1));
    }
    return 0;
  };

  const body = new LatheGeometry(profile, 56);
  const pos = body.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  const deep = new Color("#9e0f1f");
  const red = new Color("#d8202f");
  const pale = new Color("#f2c3a2");
  const c = new Color();
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + 0.035 * noise3(v.x * 9, v.y * 9, v.z * 9); // gently lumpy
    pos.setXYZ(i, v.x * k, v.y, v.z * k);
    const h = (v.y + 0.45) / 0.79; // 0 at the tip, 1 at the top
    c.copy(deep)
      .lerp(red, smooth(0, 0.55, h))
      .lerp(pale, smooth(0.93, 1, h) * 0.8);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  body.setAttribute("color", new BufferAttribute(colors, 3));
  body.computeVertexNormals();

  // seeds, spread evenly with the golden angle and set into the skin
  const count = 190;
  const seeds = new InstancedMesh(
    new SphereGeometry(1, 8, 6),
    new MeshStandardMaterial({ color: "#e9b93f", roughness: 0.5 }),
    count,
  );
  const o = new Object3D();
  for (let i = 0; i < count; i++) {
    const y = mix(-0.4, 0.27, (i + 0.5) / count);
    const a = i * 2.39996;
    const r = radiusAt(y) * 0.99;
    o.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    o.lookAt(o.position.x * 2, y + 0.15, o.position.z * 2); // lie flat against the skin
    o.scale.set(0.011, 0.016, 0.005);
    o.updateMatrix();
    seeds.setMatrixAt(i, o.matrix);
  }

  // leaves (sepals) splayed out over the shoulders, and the stem
  const green: BufferGeometry[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + (i % 2) * 0.15;
    const len = i % 2 ? 0.27 : 0.33;
    green.push(
      new ConeGeometry(0.075, len, 4)
        .scale(1, 1, 0.18) // flat like a leaf
        .translate(0, len / 2, 0)
        .rotateZ(-Math.PI / 2 - 0.32) // reach outward, lying along the shoulder
        .rotateY(a)
        .translate(0, 0.352, 0),
    );
  }
  green.push(
    new TubeGeometry(
      new CatmullRomCurve3([new Vector3(0, 0.32, 0), new Vector3(0.01, 0.42, 0.01), new Vector3(0.05, 0.5, 0.03)]),
      10,
      0.018,
      6,
      false,
    ),
  );

  return {
    body,
    seeds,
    leaves: mergeGeometries(green),
    skin: new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    leaf: new MeshStandardMaterial({ color: "#3d8b37", roughness: 0.7, side: DoubleSide }),
  };
}
