// The waterfall ribbon and the mist puffs around the main mountain.

import { CanvasTexture, PlaneGeometry, SRGBColorSpace, Vector3 } from "three";

export const waterShader = {
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
export function buildWaterfall(lip: Vector3, outward: Vector3, drop: number) {
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
export function mistTexture() {
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
