// The moving bits: fountain water, the waving flag, painted signs, the glowing trail of dots to Mark,
// the ring where you clicked, and confetti when you find him.

import {
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  RingGeometry,
  ShaderMaterial,
  TubeGeometry,
  type Curve,
  type Texture,
  type Vector3,
} from "three";
import { flagTexture, signTexture, welcomeTexture } from "./labels";
import { time } from "./materials";
import type { Fall, SignPlacement, WaterDisc } from "./props";
import { streamMaterial, waterSurfaceMaterial } from "./water";

type Disposable = { dispose: () => void };

export function buildWaters(waters: WaterDisc[], falls: Fall[], jets: Curve<Vector3>[]) {
  const group = new Group();
  const disposables: Disposable[] = [];
  const surface = waterSurfaceMaterial();
  const sheet = streamMaterial(false, 1.4);
  const jet = streamMaterial(true, 2.2);
  disposables.push(surface, sheet, jet);
  for (const w of waters) {
    const geo = new CircleGeometry(w.r, 40).rotateX(-Math.PI / 2);
    const m = new Mesh(geo, surface);
    m.position.set(w.x, w.y, w.z);
    group.add(m);
    disposables.push(geo);
  }
  for (const f of falls) {
    const geo = new CylinderGeometry(f.rTop, f.rBottom, f.h, 32, 1, true).translate(0, f.h / 2, 0);
    const m = new Mesh(geo, sheet);
    m.position.set(f.x, f.y, f.z);
    m.renderOrder = 3;
    group.add(m);
    disposables.push(geo);
  }
  for (const c of jets) {
    const geo = new TubeGeometry(c, 24, 0.045, 5, false);
    const m = new Mesh(geo, jet);
    m.renderOrder = 3;
    group.add(m);
    disposables.push(geo);
  }
  return { group, dispose: () => disposables.forEach((d) => d.dispose()) };
}

/** The Philippine flag, rippling in the breeze from the top of its pole. */
export function buildFlag(x: number, z: number, top: number) {
  const tex = flagTexture();
  const geo = new PlaneGeometry(2.6, 1.3, 24, 8).translate(1.3, 0, 0);
  const mat = new ShaderMaterial({
    uniforms: { uTime: time, uMap: { value: tex } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying float vShade;
      void main() {
        vUv = uv;
        vec3 p = position;
        float k = p.x / 2.6;
        float w = sin(p.x * 2.4 - uTime * 6.0) * 0.18 * k + sin(p.x * 4.1 - uTime * 9.0 + p.y) * 0.05 * k;
        p.z += w;
        p.y -= k * k * 0.12;
        vShade = 0.82 + 0.18 * cos(p.x * 2.4 - uTime * 6.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying vec2 vUv;
      varying float vShade;
      void main() {
        vec4 c = texture2D(uMap, vUv);
        gl_FragColor = vec4(c.rgb * vShade, 1.0);
        #include <colorspace_fragment>
      }
    `,
    side: DoubleSide,
  });
  const flag = new Mesh(geo, mat);
  flag.position.set(x + 0.08, top - 0.75, z);
  flag.rotation.y = 0.6;
  flag.castShadow = true;
  return { mesh: flag, dispose: () => [tex, geo, mat].forEach((d) => d.dispose()) };
}

/** Painted signs, once the site's fonts have loaded. */
export function buildSigns(list: SignPlacement[], welcome: SignPlacement | null) {
  const group = new Group();
  const disposables: Disposable[] = [];
  const plane = (texture: Texture, s: SignPlacement, w: number, h: number) => {
    const geo = new PlaneGeometry(w, h);
    const mat = new MeshLambertMaterial({ map: texture });
    const m = new Mesh(geo, mat);
    m.position.set(s.x, s.y, s.z);
    m.rotation.y = s.ry;
    group.add(m);
    disposables.push(geo, mat, texture);
  };
  for (const s of list) {
    const { texture, aspect } = signTexture(s.name, s.index);
    // keep the lettering in proportion: as wide as the wall allows, then as tall as that width needs
    const w = Math.min(s.w, s.h * aspect * 1.6);
    plane(texture, s, w, w / aspect);
  }
  if (welcome) plane(welcomeTexture(), welcome, welcome.w, welcome.h);
  return { group, dispose: () => disposables.forEach((d) => d.dispose()) };
}

const MAX_DOTS = 260;
const SPACING = 1.5;

/** Glowing dots along the trail to Mark, pulsing toward him. */
export class Trail {
  readonly mesh: InstancedMesh;
  private dummy = new Object3D();
  constructor() {
    this.mesh = new InstancedMesh(
      new CircleGeometry(0.24, 14).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: "#ffcf6a", transparent: true, opacity: 0.95, depthWrite: false }),
      MAX_DOTS,
    );
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }
  update(trail: [number, number][] | null, t: number, heightAt: (x: number, z: number) => number) {
    if (!trail || trail.length < 2) {
      this.mesh.count = 0;
      return;
    }
    let n = 0;
    let carry = 0.8;
    let run = 0;
    for (let i = 0; i < trail.length - 1 && n < MAX_DOTS; i++) {
      const [ax, az] = trail[i];
      const [bx, bz] = trail[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      for (let s = carry; s < len && n < MAX_DOTS; s += SPACING) {
        const x = ax + ((bx - ax) * s) / len;
        const z = az + ((bz - az) * s) / len;
        const along = run + s;
        const pulse = 0.65 + 0.45 * Math.max(0, Math.sin(along * 0.35 - t * 5));
        this.dummy.position.set(x, heightAt(x, z) + 0.12, z);
        this.dummy.scale.setScalar(pulse);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(n++, this.dummy.matrix);
        carry = s + SPACING - len;
      }
      if (carry >= len) carry -= len;
      run += len;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicMaterial).dispose();
  }
}

/** A ring on the ground where you clicked. */
export function buildClickRing() {
  const mesh = new Mesh(
    new RingGeometry(0.42, 0.6, 32).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: "#fdfaf3", transparent: true, opacity: 0.9, depthWrite: false }),
  );
  mesh.renderOrder = 2;
  mesh.visible = false;
  return mesh;
}

/** A burst of paper confetti. */
export class Confetti {
  readonly mesh: InstancedMesh;
  private parts: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    rx: number;
    ry: number;
    spin: number;
  }[] = [];
  private dummy = new Object3D();
  private age = 99;

  constructor(count = 180) {
    this.mesh = new InstancedMesh(new PlaneGeometry(0.16, 0.1), new MeshBasicMaterial({ side: DoubleSide }), count);
    const colours = ["#d63c62", "#f2a516", "#1b8e8e", "#2c56b8", "#f4d78f", "#6b4aa6", "#fdfaf3"];
    const c = new Color();
    for (let i = 0; i < count; i++) this.mesh.setColorAt(i, c.set(colours[i % colours.length]));
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.count = count;
  }

  burst(x: number, y: number, z: number) {
    this.parts = [];
    for (let i = 0; i < this.mesh.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1.5 + Math.random() * 3.5;
      this.parts.push({
        x,
        y,
        z,
        vx: Math.cos(a) * s,
        vy: 4 + Math.random() * 5,
        vz: Math.sin(a) * s,
        rx: Math.random() * 6,
        ry: Math.random() * 6,
        spin: 4 + Math.random() * 8,
      });
    }
    this.age = 0;
    this.mesh.visible = true;
  }

  update(dt: number) {
    if (!this.mesh.visible) return;
    this.age += dt;
    this.parts.forEach((p, i) => {
      p.vy -= 9 * dt;
      const drag = Math.pow(0.4, dt);
      p.vx *= drag;
      p.vz *= drag;
      p.vy = Math.max(p.vy, -1.6); // paper flutters down slowly
      p.x += p.vx * dt + Math.sin(this.age * 4 + i) * 0.01;
      p.y = Math.max(p.y + p.vy * dt, 0.05);
      p.z += p.vz * dt;
      p.rx += p.spin * dt;
      p.ry += p.spin * 0.7 * dt;
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.rx, p.ry, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.age > 7) this.mesh.visible = false;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicMaterial).dispose();
  }
}
