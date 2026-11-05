"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  BufferAttribute,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  SplineCurve,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Group,
  type Mesh,
} from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { seeded } from "@/lib/seeded";

/* ------------------------------------------------------------------ noise */

// Small deterministic 3D value noise, enough to carve cliffs and vary colour.
function hash(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => ease(Math.min(Math.max((x - a) / (b - a), 0), 1));

function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = ease(x - xi);
  const yf = ease(y - yi);
  const zf = ease(z - zi);
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
  const a = mix(mix(c(0, 0, 0), c(1, 0, 0), xf), mix(c(0, 1, 0), c(1, 1, 0), xf), yf);
  const b = mix(mix(c(0, 0, 1), c(1, 0, 1), xf), mix(c(0, 1, 1), c(1, 1, 1), xf), yf);
  return mix(a, b, zf) * 2 - 1;
}

function fbm(x: number, y: number, z: number, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * f, y * f, z * f);
    f *= 2.07;
    amp *= 0.5;
  }
  return sum;
}

/* ------------------------------------------------------------------ rock */

type RockSpec = {
  /** silhouette as [radius, height] pairs from the hanging tip up to the plateau */
  profile: [number, number][];
  seed: number;
  /** how deeply the cliffs are carved */
  rough: number;
};

const rockA = new Color("#6c6862");
const rockB = new Color("#928a7e");
const rockDark = new Color("#2b2927");
const moss = new Color("#2f5a24");
const mossLight = new Color("#5f8a37");

// A lathe-turned pillar, carved with noise into vertical buttresses and ledges, then
// painted with layered stone that darkens underneath and moss where rain and light land.
function buildRock({ profile, seed, rough }: RockSpec) {
  const outline = new SplineCurve(profile.map(([r, y]) => new Vector2(r, y))).getPoints(80);
  let geo: BufferGeometry = new LatheGeometry(
    outline.map((p) => new Vector2(Math.max(p.x, 0), p.y)),
    84,
  );
  geo.deleteAttribute("uv");
  geo.deleteAttribute("normal");
  geo = mergeVertices(geo, 1e-4);

  const pos = geo.getAttribute("position");
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (Math.hypot(v.x, v.z) < 1e-5) continue;
    const ridges = fbm(v.x * 2.1 + seed, v.y * 0.4, v.z * 2.1 + seed); // tall buttresses
    const chips = fbm(v.x * 5.5 + seed, v.y * 4.5, v.z * 5.5, 3); // cracks and chips
    const ledges = Math.sin(v.y * 10 + ridges * 5) * 0.035; // horizontal strata
    const k = 1 + rough * (ridges * 0.95 + chips * 0.45) + ledges;
    pos.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  geo.computeVertexNormals();

  const yMin = profile[0][1];
  const yMax = profile[profile.length - 1][1];
  const nor = geo.getAttribute("normal");
  const colors = new Float32Array(pos.count * 3);
  const c = new Color();
  const m = new Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ny = nor.getY(i);
    const h = (v.y - yMin) / (yMax - yMin); // 0 at the tip, 1 on the plateau
    const grain = fbm(v.x * 2.5 + seed, v.y * 2.5, v.z * 2.5);
    c.copy(rockA).lerp(rockB, (0.5 + 0.5 * Math.sin(v.y * 9 + grain * 3)) * 0.65);
    c.lerp(rockDark, (1 - h) * 0.5 + Math.max(-ny, 0) * 0.25);
    // moss streaks that run down the walls from the jungle above, like rain-fed growth
    const streaks = smooth(0.12, 0.38, fbm(v.x * 3.2 + seed, v.y * 0.25, v.z * 3.2)) * smooth(0.25, 0.85, h);
    const mossy =
      smooth(0.25, 0.7, ny + grain * 0.5) * smooth(0.35, 0.7, h) +
      smooth(0.84, 0.97, h + grain * 0.12) * 0.85 +
      streaks * 0.75;
    m.copy(moss).lerp(mossLight, 0.5 + grain);
    c.lerp(m, Math.min(mossy, 1));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return geo;
}

/* --------------------------------------------------------------- jungle */

const greens = ["#1f4d22", "#2b5e27", "#356b2c", "#24502f", "#3f7431", "#1a4228", "#4a7d34"];

// One lumpy leaf-cluster shape, reused for every bush and canopy.
function leafClump() {
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
function dressRock(geo: BufferGeometry, spec: RockSpec, d: Dressing, rand: ReturnType<typeof seeded>) {
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

/* ------------------------------------------------------------- waterfall */

const waterShader = {
  uniforms: { uTime: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
    }
    void main() {
      float t = 1.0 - vUv.y; // 0 at the lip, 1 where it dissolves into mist
      vec2 p = vec2(vUv.x * 7.0, t * 6.0 - uTime * 1.8);
      float streak = n(p * vec2(1.0, 0.3)) * 0.6 + n(p * vec2(3.0, 1.1)) * 0.4;
      float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
      float fade = smoothstep(1.0, 0.4, t) * smoothstep(0.0, 0.03, t);
      vec3 col = mix(vec3(0.74, 0.86, 0.94), vec3(1.0), streak);
      gl_FragColor = vec4(col, min((0.45 + 0.75 * streak) * edge * fade, 1.0));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
};

// A ribbon of water pouring off the rim in an arc, widening as it falls.
function buildWaterfall(lip: Vector3, outward: Vector3, drop: number) {
  const geo = new PlaneGeometry(1, 1, 1, 48);
  const pos = geo.getAttribute("position");
  const side = new Vector3(-outward.z, 0, outward.x);
  const p = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    const across = pos.getX(i); // -0.5 … 0.5
    const t = 0.5 - pos.getY(i); // 0 at the lip, 1 at the bottom
    p.copy(lip)
      .addScaledVector(outward, 0.03 + 0.42 * Math.sqrt(t))
      .addScaledVector(side, across * (0.2 + t * 0.5))
      .setY(lip.y - t * drop);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  return geo;
}

// Soft white puff, used for the mist hanging around the mountain's base.
function mistTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(232,238,244,0.9)");
  g.addColorStop(0.45, "rgba(232,238,244,0.4)");
  g.addColorStop(1, "rgba(232,238,244,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ city */

const walls = ["#f4d78f", "#efe2c8", "#e8b98a", "#d9c7b0", "#f2c6b4", "#cfd9dd"];
const roofs = ["#b8443a", "#c8573f", "#8c3b35", "#2f5f6b", "#d63c62", "#9a4a2e"];

// Bakes a flat colour into a part so the whole city can share one mesh and one material.
function paint(geo: BufferGeometry, hex: string) {
  const c = new Color(hex);
  const n = geo.getAttribute("position").count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return geo;
}

// Square pyramid roof sized to a w × d footprint.
function pyramid(w: number, d: number, h: number) {
  return new ConeGeometry(w / Math.SQRT2, h, 4).rotateY(Math.PI / 4).scale(1, 1, d / w);
}

// A little hilltop town: a cathedral with twin spires and a dome at the centre, a clock tower,
// and a ring of tile-roofed houses, every one with warm lit windows. `base` is the plateau height.
function buildCity(rand: ReturnType<typeof seeded>, base: number, radius: number) {
  const parts: BufferGeometry[] = [];
  const lights: BufferGeometry[] = [];
  const m = new Matrix4();
  const put = (list: BufferGeometry[], geo: BufferGeometry, x: number, z: number, turn: number) =>
    list.push(geo.applyMatrix4(m.makeRotationY(turn).setPosition(x, base, z)));

  // A row of lit windows up both long faces of a w × h × d block.
  const windowsOn = (w: number, h: number, d: number, from = 0.035) => {
    const out: BufferGeometry[] = [];
    for (let y = from; y < h - 0.025; y += 0.05) {
      for (const x of w > 0.07 ? [-w * 0.25, w * 0.25] : [0]) {
        if (rand.next() < 0.18) continue; // some rooms are dark
        for (const side of [1, -1]) out.push(new BoxGeometry(0.014, 0.02, 0.006).translate(x, y, (side * d) / 2));
      }
    }
    return out;
  };

  // Cathedral, facing outward along +z.
  const cathedral: [BufferGeometry, string][] = [
    [new BoxGeometry(0.15, 0.17, 0.32).translate(0, 0.085, 0), "#efe6d6"],
    [
      new ConeGeometry(0.095, 0.3, 3)
        .rotateX(-Math.PI / 2)
        .scale(1, 0.75, 1)
        .rotateZ(Math.PI)
        .translate(0, 0.2, 0),
      "#6b4a3a",
    ],
    [new BoxGeometry(0.055, 0.34, 0.055).translate(-0.055, 0.17, 0.15), "#e9ddc6"],
    [new BoxGeometry(0.055, 0.34, 0.055).translate(0.055, 0.17, 0.15), "#e9ddc6"],
    [pyramid(0.07, 0.07, 0.17).translate(-0.055, 0.425, 0.15), "#3c4a5a"],
    [pyramid(0.07, 0.07, 0.17).translate(0.055, 0.425, 0.15), "#3c4a5a"],
    [new SphereGeometry(0.075, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.2, -0.07), "#1b8e8e"],
    [new ConeGeometry(0.015, 0.07, 6).translate(0, 0.31, -0.07), "#f2a516"],
  ];
  cathedral.forEach(([g, c]) => put(parts, paint(g, c), 0, 0.02, 0));
  put(lights, new CircleGeometry(0.03, 16).translate(0, 0.12, 0.161), 0, 0.02, 0); // rose window
  windowsOn(0.15, 0.15, 0.32).forEach((g) => put(lights, g.rotateY(Math.PI / 2), 0, 0.02, 0));

  // Clock tower beside it.
  put(parts, paint(new BoxGeometry(0.05, 0.3, 0.05).translate(0, 0.15, 0), "#e8b98a"), 0.17, -0.12, 0.3);
  put(parts, paint(pyramid(0.065, 0.065, 0.1).translate(0, 0.35, 0), "#b8443a"), 0.17, -0.12, 0.3);
  put(lights, new CircleGeometry(0.014, 12).translate(0, 0.25, 0.026), 0.17, -0.12, 0.3);

  // Houses in loose rings around the square, taller towards the middle.
  const taken: [number, number, number][] = [
    [0, 0.02, 0.2],
    [0.17, -0.12, 0.06],
  ];
  for (let tries = 0; tries < 160 && taken.length < 30; tries++) {
    const a = rand.range(0, Math.PI * 2);
    const r = rand.range(0.2, radius);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const w = rand.range(0.06, 0.1);
    if (taken.some(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) < tr + w * 0.75)) continue;
    taken.push([x, z, w * 0.75]);
    const d = w * rand.range(0.8, 1.2);
    const h = rand.range(0.07, 0.12) + (radius - r) * 0.35;
    const turn = -a + Math.PI / 2 + rand.range(-0.25, 0.25);
    put(parts, paint(new BoxGeometry(w, h, d).translate(0, h / 2, 0), rand.pick(walls)), x, z, turn);
    put(parts, paint(pyramid(w * 1.1, d * 1.1, h * 0.5).translate(0, h + h * 0.25, 0), rand.pick(roofs)), x, z, turn);
    windowsOn(w, h, d).forEach((g) => put(lights, g, x, z, turn));
  }

  return { buildings: mergeGeometries(parts), windows: mergeGeometries(lights) };
}

/* -------------------------------------------------------------- big tree */

// An old giant: a gnarled, flared trunk with roots gripping the rock, wide branches,
// a broad layered canopy, and thin aerial roots hanging from the boughs. `base` is the ground height.
function buildTree(rand: ReturnType<typeof seeded>, base: number) {
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

/* ----------------------------------------------------------- Molo Church */

// A gable roof: a triangular prism running front to back, `w` wide and `h` tall, sitting on y = 0.
function gable(w: number, h: number, depth: number) {
  const r = w / Math.sqrt(3);
  return new CylinderGeometry(r, r, depth, 3)
    .rotateX(-Math.PI / 2)
    .translate(0, r / 2, 0)
    .scale(1, h / (1.5 * r), 1);
}

// Small cross: an upright and an arm.
function cross(size: number) {
  return [
    new BoxGeometry(size * 0.18, size, size * 0.18),
    new BoxGeometry(size * 0.6, size * 0.18, size * 0.18).translate(0, size * 0.18, 0),
  ];
}

// St. Anne Parish Church in Molo, Iloilo, in miniature. Details from descriptions of the real church:
// warm cream coral-stone facade framed by twin bell towers; square lower tiers with decorated corners
// rising to octagonal belfries pierced alternately with lancet and round windows, under tall deep-red
// spires; two cornices across the front, Tuscan pilasters, a rose window, an arched niche with the
// Sta. Ana mosaic, a pediment with its own niche and crucifix and little pinnacles; a deep-red roof
// and a red dome over the crossing. In front, Molo Plaza: a paved axis from the door, a round garden,
// acacias on both sides, and the white domed rotunda. The facade faces +z; `base` is the ground height.
function buildChurch(base: number) {
  const parts: BufferGeometry[] = [];
  const add = (geo: BufferGeometry, color: string, x = 0, y = 0, z = 0, turn = 0) =>
    // non-indexed throughout, so the icosahedron leaves merge with the boxes and cones
    parts.push(paint((geo.index ? geo.toNonIndexed() : geo).rotateY(turn).translate(x, base + y, z), color));
  const coral = "#e9dcc0";
  const trim = "#f4ecdb";
  const red = "#a8322b";
  const dark = "#2f2a2a";
  const zF = 0.12; // facade plane
  const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d).translate(0, h / 2, 0); // sits on y = 0

  // nave and transept, deep-red roofs, red dome over the crossing
  add(box(0.22, 0.2, 0.46), coral, 0, 0, zF - 0.25);
  add(gable(0.24, 0.12, 0.46), red, 0, 0.2, zF - 0.25);
  add(box(0.36, 0.18, 0.12), coral, 0, 0, -0.26);
  add(gable(0.14, 0.1, 0.36).rotateY(Math.PI / 2), red, 0, 0.18, -0.26);
  add(new CylinderGeometry(0.06, 0.064, 0.07, 8).translate(0, 0.035, 0), coral, 0, 0.27, -0.26); // drum
  add(new SphereGeometry(0.064, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), red, 0, 0.34, -0.26);
  add(new CylinderGeometry(0.012, 0.014, 0.03, 8).translate(0, 0.015, 0), trim, 0, 0.4, -0.26); // lantern
  cross(0.035).forEach((g) => add(g, dark, 0, 0.45, -0.26));
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) add(new BoxGeometry(0.004, 0.07, 0.03), dark, side * 0.111, 0.1, -0.02 - k * 0.09); // lancets
    for (let k = 0; k < 4; k++) add(new ConeGeometry(0.011, 0.05, 4), trim, side * 0.11, 0.225, 0.06 - k * 0.1); // pinnacles
  }

  // facade: wall, two cornices, four pilasters, door, rose window, mosaic niche, side lancets
  add(box(0.2, 0.28, 0.04), coral, 0, 0, zF);
  for (const y of [0.12, 0.24]) add(new BoxGeometry(0.37, 0.012, 0.1), trim, 0, y, zF);
  for (const x of [-0.088, -0.032, 0.032, 0.088]) add(box(0.012, 0.28, 0.008), trim, x, 0, zF + 0.022);
  add(box(0.046, 0.075, 0.006), dark, 0, 0, zF + 0.021); // main door
  add(new ConeGeometry(0.023, 0.04, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.15), dark, 0, 0.095, zF + 0.021); // pointed arch
  add(new CircleGeometry(0.034, 24), trim, 0, 0.175, zF + 0.0205);
  add(new CircleGeometry(0.027, 24), dark, 0, 0.175, zF + 0.021); // rose window
  for (const r of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4])
    add(new BoxGeometry(0.052, 0.004, 0.003).rotateZ(r), trim, 0, 0.175, zF + 0.022); // tracery
  add(box(0.03, 0.03, 0.005), "#3d6fa8", 0, 0.205, zF + 0.021); // Sta. Ana mosaic
  add(new CircleGeometry(0.015, 16, 0, Math.PI), "#d9a441", 0, 0.235, zF + 0.0215);
  for (const x of [-0.06, 0.06]) {
    add(box(0.016, 0.055, 0.005), dark, x, 0.035, zF + 0.021);
    add(box(0.014, 0.045, 0.005), dark, x, 0.16, zF + 0.021);
  }

  // pediment with its niche, crucifix and pinnacles along the rakes
  add(gable(0.2, 0.14, 0.04), coral, 0, 0.28, zF);
  add(box(0.022, 0.04, 0.004), dark, 0, 0.3, zF + 0.021);
  add(box(0.01, 0.026, 0.006), trim, 0, 0.302, zF + 0.022); // statue in the niche
  cross(0.05).forEach((g) => add(g, dark, 0, 0.445, zF));
  for (const [x, y] of [
    [-0.1, 0.28],
    [-0.05, 0.35],
    [0.05, 0.35],
    [0.1, 0.28],
  ])
    add(new ConeGeometry(0.009, 0.045, 4).translate(0, 0.022, 0), trim, x, y, zF);

  // twin bell towers
  for (const x of [-0.135, 0.135]) {
    add(box(0.085, 0.24, 0.085), coral, x, 0, zF);
    for (const [dx, dz] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ])
      add(box(0.012, 0.36, 0.012), trim, x + dx * 0.04, 0, zF + dz * 0.04); // decorated corners
    add(box(0.075, 0.12, 0.075), coral, x, 0.24, zF);
    add(box(0.014, 0.06, 0.004), dark, x, 0.27, zF + 0.038); // tower lancet
    add(new BoxGeometry(0.092, 0.012, 0.092), trim, x, 0.366, zF); // cornice
    add(new CylinderGeometry(0.04, 0.042, 0.1, 8).translate(0, 0.05, 0), coral, x, 0.372, zF); // octagonal belfry
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k * Math.PI) / 4;
      const r = 0.04 * Math.cos(Math.PI / 8) + 0.002;
      const opening =
        k % 2
          ? new CircleGeometry(0.01, 12).translate(0, 0.05, r)
          : new BoxGeometry(0.012, 0.05, 0.004).translate(0, 0.045, r);
      add(opening, dark, x, 0.372, zF, a);
    }
    for (const [dx, dz] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ])
      add(new ConeGeometry(0.008, 0.05, 4).translate(0, 0.025, 0), trim, x + dx * 0.036, 0.372, zF + dz * 0.036); // corner pinnacles
    add(new CylinderGeometry(0.046, 0.046, 0.01, 8), trim, x, 0.477, zF);
    add(new ConeGeometry(0.044, 0.27, 8).translate(0, 0.135, 0), red, x, 0.482, zF); // spire
    cross(0.04).forEach((g) => add(g, dark, x, 0.77, zF));
  }

  // Molo Plaza: paved axis from the door, a round garden on it, the white domed rotunda, acacias either side
  add(new BoxGeometry(0.42, 0.01, 0.62), "#d6ccb8", 0, 0.002, -0.06); // forecourt under the church
  add(new BoxGeometry(0.08, 0.01, 0.32), "#d6ccb8", 0, 0.004, 0.3); // paved spine
  add(new CylinderGeometry(0.06, 0.06, 0.012, 24), "#d6ccb8", 0, 0.006, 0.27);
  add(new CylinderGeometry(0.048, 0.048, 0.016, 24), "#4f8a3a", 0, 0.008, 0.27); // round garden
  add(new CylinderGeometry(0.045, 0.045, 0.012, 16), "#f7f3ea", 0, 0.008, 0.41); // rotunda base
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    add(
      new CylinderGeometry(0.004, 0.004, 0.06, 6).translate(0, 0.03, 0),
      "#f7f3ea",
      Math.sin(a) * 0.034,
      0.014,
      0.41 + Math.cos(a) * 0.034,
    );
  }
  add(new SphereGeometry(0.04, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), "#f7f3ea", 0, 0.074, 0.41); // rotunda dome
  add(box(0.008, 0.03, 0.008), trim, 0, 0.014, 0.41); // statue under it
  for (const [x, z] of [
    [-0.15, 0.2],
    [0.15, 0.2],
    [-0.16, 0.36],
    [0.16, 0.36],
    [-0.27, -0.3],
    [0.27, -0.3],
  ]) {
    add(new CylinderGeometry(0.007, 0.011, 0.07, 5).translate(0, 0.035, 0), "#5b4532", x, 0, z);
    add(new IcosahedronGeometry(0.06, 1).scale(1, 0.45, 1), "#3f7431", x, 0.085, z); // flat acacia crown
  }

  return mergeGeometries(parts);
}

/* ----------------------------------------------------------------- scene */

const MAIN: RockSpec = {
  profile: [
    [0.02, -3.4],
    [0.4, -3.0],
    [0.72, -2.4],
    [0.92, -1.6],
    [1.0, -0.8],
    [1.03, 0.0],
    [1.08, 0.7],
    [1.04, 0.98],
    [0.7, 1.07],
    [0.0, 1.1],
  ],
  seed: 3.1,
  rough: 0.38,
};

// Smaller rocks drifting alongside the main mountain.
const SATELLITES: {
  spec: RockSpec;
  at: [number, number, number];
  scale: number;
  phase: number;
  city?: boolean;
  tree?: boolean;
  church?: boolean;
}[] = [
  {
    spec: {
      // broad, flat-topped so a town fits on it
      profile: [
        [0.02, -1.2],
        [0.32, -0.8],
        [0.56, -0.3],
        [0.66, 0.1],
        [0.64, 0.24],
        [0.4, 0.29],
        [0.0, 0.3],
      ],
      seed: 8.4,
      rough: 0.26,
    },
    at: [-4.2, 0.9, -0.6],
    scale: 1.3,
    phase: 1.3,
    city: true,
  },
  {
    spec: {
      // flatter top for the big tree's roots to spread over
      profile: [
        [0.02, -0.9],
        [0.27, -0.6],
        [0.45, -0.2],
        [0.5, 0.08],
        [0.47, 0.2],
        [0.3, 0.24],
        [0.0, 0.25],
      ],
      seed: 15.2,
      rough: 0.3,
    },
    at: [4.0, -0.8, 1.0],
    scale: 1.1,
    phase: 2.6,
    tree: true,
  },
  {
    spec: {
      // broad and flat on top, for the church and its plaza
      profile: [
        [0.02, -1.0],
        [0.3, -0.65],
        [0.5, -0.25],
        [0.58, 0.08],
        [0.56, 0.2],
        [0.36, 0.25],
        [0.0, 0.26],
      ],
      seed: 22.7,
      rough: 0.26,
    },
    at: [2.8, 0.6, -2.8], // low enough that the spires clear the top of the band as it swings past
    scale: 1.35,
    phase: 4.1,
    church: true,
  },
];

function buildScene() {
  const rand = seeded(42);
  const stone = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const bark = new MeshStandardMaterial({ color: "#4e3d2c", roughness: 1 });
  const vine = new MeshStandardMaterial({ color: "#33592a", roughness: 0.9 });

  const mainRock = buildRock(MAIN);
  const main = {
    rock: mainRock,
    ...dressRock(mainRock, MAIN, { size: 1, bushes: 320, edge: 170, trees: 9, vines: 38 }, rand),
  };

  const satellites = SATELLITES.map((s) => {
    const rock = buildRock(s.spec);
    // The city rock keeps its greenery to the rim so the town shows; the others are wild jungle.
    // The big tree's rock gets only low undergrowth around its roots.
    const growth = s.city
      ? { size: 0.6, bushes: 0, edge: 40, trees: 0, vines: 8 }
      : s.tree
        ? { size: 0.6, bushes: 8, edge: 30, trees: 0, vines: 8 }
        : s.church
          ? { size: 0.6, bushes: 0, edge: 36, trees: 0, vines: 7 }
          : { size: 0.6, bushes: 60, edge: 30, trees: 2, vines: 7 };
    return {
      ...s,
      rock,
      town: s.city ? buildCity(rand, 0.25, 0.46) : null,
      bigTree: s.tree ? buildTree(rand, 0.21) : null,
      molo: s.church ? buildChurch(0.235) : null,
      ...dressRock(rock, s.spec, growth, rand),
    };
  });
  const brick = new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const glow = new MeshStandardMaterial({ color: "#ffd27a", emissive: "#ffb347", emissiveIntensity: 1.4 });
  const wood = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });

  // Put the waterfall on the rim point that starts out facing the viewer.
  const pos = mainRock.getAttribute("position");
  const nor = mainRock.getAttribute("normal");
  const lipIndex = main.rims
    .filter((i) => pos.getY(i) > 0.55 && pos.getY(i) < 0.95)
    .reduce((best, i) => (pos.getZ(i) > pos.getZ(best) ? i : best), main.rims[0]);
  const lip = new Vector3().fromBufferAttribute(pos, lipIndex);
  const outward = new Vector3(nor.getX(lipIndex), 0, nor.getZ(lipIndex)).normalize();
  const drop = 4.2;
  const waterfall = {
    geo: buildWaterfall(lip, outward, drop),
    material: new ShaderMaterial({
      ...waterShader,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    }),
    foot: lip
      .clone()
      .addScaledVector(outward, 0.5)
      .setY(lip.y - drop * 0.55),
  };

  const mist = mistTexture();
  const puffs = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + rand.range(-0.3, 0.3);
    const r = rand.range(0.9, 1.6);
    return {
      at: [Math.cos(a) * r, rand.range(-2.6, -1.2), Math.sin(a) * r] as [number, number, number],
      scale: rand.range(1.6, 2.6),
      opacity: rand.range(0.25, 0.45),
    };
  });

  return { stone, bark, vine, brick, glow, wood, main, satellites, waterfall, mist, puffs };
}

/** Extra turn the visitor gives the scene by dragging or swiping, with a little fling momentum. */
export class Spin {
  angle = 0; // radians
  private velocity = 0;
  private dragging = false;
  private lastX = 0;

  start(x: number) {
    this.dragging = true;
    this.velocity = 0;
    this.lastX = x;
  }
  move(x: number) {
    if (!this.dragging) return;
    const turn = (x - this.lastX) * 0.008;
    this.lastX = x;
    this.angle += turn;
    this.velocity = turn;
  }
  end() {
    this.dragging = false;
  }
  /** Called every frame: keeps a fling going after release, easing to a stop. */
  step(delta: number) {
    if (this.dragging) return;
    this.angle += this.velocity * delta * 60;
    this.velocity *= Math.pow(0.93, delta * 60);
  }
}

// A towering floating mountain wrapped in jungle, with a waterfall pouring off the edge.
export default function FloatingMountain({ spin }: { spin?: Spin }) {
  const scene = useMemo(() => buildScene(), []);
  const root = useRef<Group>(null);
  const drift = useRef(0); // the slow turn it makes on its own
  const sats = useRef<(Group | null)[]>([]);
  const water = useRef<Mesh>(null);

  useEffect(
    () => () => {
      const { stone, bark, vine, brick, glow, wood, main, satellites, waterfall, mist } = scene;
      [stone, bark, vine, brick, glow, wood, waterfall.material, waterfall.geo, mist].forEach((x) => x.dispose());
      satellites.forEach((s) => {
        s.town?.buildings.dispose();
        s.town?.windows.dispose();
        s.bigTree?.wood.dispose();
        s.bigTree?.canopy.geometry.dispose();
        (s.bigTree?.canopy.material as MeshStandardMaterial | undefined)?.dispose();
        s.bigTree?.canopy.dispose();
        s.molo?.dispose();
      });
      [main, ...satellites].forEach((r) => {
        r.rock.dispose();
        r.trunks?.dispose();
        r.vines?.dispose();
        r.foliage.geometry.dispose();
        (r.foliage.material as MeshStandardMaterial).dispose();
        r.foliage.dispose();
      });
    },
    [scene],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (root.current) {
      drift.current += delta * 0.12;
      root.current.rotation.y = drift.current + (spin?.angle ?? 0);
      root.current.position.y = 0.25 + Math.sin(t * 0.6) * 0.12;
    }
    scene.satellites.forEach((s, i) => {
      const g = sats.current[i];
      if (g) g.position.y = s.at[1] + Math.sin(t * 0.8 + s.phase) * 0.12;
    });
    if (water.current) (water.current.material as ShaderMaterial).uniforms.uTime.value = t;
  });

  const { stone, bark, vine, brick, glow, wood, main, satellites, waterfall, mist, puffs } = scene;

  return (
    <group ref={root} scale={1.3}>
      <mesh geometry={main.rock} material={stone} castShadow receiveShadow />
      <primitive object={main.foliage} />
      {main.trunks && <mesh geometry={main.trunks} material={bark} castShadow />}
      {main.vines && <mesh geometry={main.vines} material={vine} />}

      <mesh ref={water} geometry={waterfall.geo} material={waterfall.material} renderOrder={2} />
      <Sparkles
        position={waterfall.foot}
        count={30}
        scale={[0.7, 0.9, 0.7]}
        size={3}
        speed={0.5}
        opacity={0.7}
        color="#ffffff"
      />

      {puffs.map((p, i) => (
        <sprite key={i} position={p.at} scale={p.scale} renderOrder={3}>
          <spriteMaterial map={mist} transparent opacity={p.opacity} depthWrite={false} />
        </sprite>
      ))}

      {satellites.map((s, i) => (
        <group
          key={i}
          ref={(el) => {
            sats.current[i] = el;
          }}
          position={s.at}
          // The church's facade points away from the centre of the orbit, so it faces the
          // viewer whenever it swings round to the front.
          rotation={[0, s.church ? Math.atan2(s.at[0], s.at[2]) : 0, 0]}
          scale={s.scale}
        >
          <mesh geometry={s.rock} material={stone} castShadow receiveShadow />
          <primitive object={s.foliage} />
          {s.trunks && <mesh geometry={s.trunks} material={bark} castShadow />}
          {s.vines && <mesh geometry={s.vines} material={vine} />}
          {s.town && (
            <>
              <mesh geometry={s.town.buildings} material={brick} castShadow receiveShadow />
              <mesh geometry={s.town.windows} material={glow} />
            </>
          )}
          {s.bigTree && (
            <>
              <mesh geometry={s.bigTree.wood} material={wood} castShadow receiveShadow />
              <primitive object={s.bigTree.canopy} />
            </>
          )}
          {s.molo && <mesh geometry={s.molo} material={brick} castShadow receiveShadow />}
        </group>
      ))}

      {/* drifting seeds and spores catching the light */}
      <Sparkles count={45} scale={[7, 4.5, 5]} size={1.6} speed={0.2} opacity={0.55} color="#d9f7c4" />
    </group>
  );
}
