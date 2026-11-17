// A warm afternoon sky: deep blue overhead fading to a hazy peach horizon, a soft sun, and fat
// cumulus clouds drifting slowly across.

import {
  BackSide,
  Color,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshLambertMaterial,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { seeded } from "@/lib/seeded";

/** Where the sun is: low in the west-south-west, as on a Molo afternoon. */
export const SUN = new Vector3(-0.62, 0.52, 0.42).normalize();
export const HAZE = "#f4dcc0";

export function buildSky() {
  const material = new ShaderMaterial({
    uniforms: {
      uSun: { value: SUN },
      uTop: { value: new Color("#3f86cf") },
      uMid: { value: new Color("#8cc4ea") },
      uHorizon: { value: new Color(HAZE) },
      uGlow: { value: new Color("#ffd29a") },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun, uTop, uMid, uHorizon, uGlow;
      varying vec3 vDir;
      void main() {
        float y = max(vDir.y, 0.0);
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, y));
        col = mix(col, uTop, smoothstep(0.2, 0.85, y));
        float s = max(dot(normalize(vDir), uSun), 0.0);
        col += uGlow * pow(s, 8.0) * 0.45 + vec3(1.0, 0.95, 0.85) * pow(s, 400.0) * 1.2;
        col = mix(col, uHorizon, smoothstep(0.02, -0.15, vDir.y));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
    side: BackSide,
    depthWrite: false,
    fog: false,
  });
  const dome = new Mesh(new SphereGeometry(1500, 32, 16), material);
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  return dome;
}

export function buildClouds() {
  const rand = seeded(5);
  const group = new Group();
  const material = new MeshLambertMaterial({
    color: "#ffffff",
    emissive: new Color("#ffe9d2"),
    emissiveIntensity: 0.45,
    fog: false,
  });
  for (let i = 0; i < 16; i++) {
    const puffs = [];
    const n = 5 + Math.floor(rand.next() * 5);
    for (let p = 0; p < n; p++) {
      const r = rand.range(14, 30);
      puffs.push(
        new IcosahedronGeometry(r, 2)
          .scale(1, 0.7, 1)
          .translate((p - n / 2) * rand.range(14, 22), rand.range(-4, 10) + (p % 2) * 6, rand.range(-10, 10)),
      );
    }
    const cloud = new Mesh(mergeGeometries(puffs), material);
    puffs.forEach((g) => g.dispose());
    const a = rand.range(0, Math.PI * 2);
    const d = rand.range(520, 900);
    cloud.position.set(Math.cos(a) * d, rand.range(150, 260), Math.sin(a) * d);
    cloud.rotation.y = rand.range(0, Math.PI);
    cloud.scale.setScalar(rand.range(0.8, 1.5));
    group.add(cloud);
  }
  return group;
}
