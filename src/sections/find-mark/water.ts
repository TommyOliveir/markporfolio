// Water for the fountains: a rippling, glinting surface, and sheets and jets that stream downwards.

import { AdditiveBlending, Color, DoubleSide, ShaderMaterial } from "three";
import { time } from "./materials";

/** The surface of a basin: ripples spreading out, sky glints, a little caustic shimmer. */
export function waterSurfaceMaterial() {
  return new ShaderMaterial({
    uniforms: { uTime: time, uDeep: { value: new Color("#2f7f8f") }, uShallow: { value: new Color("#8fd3df") } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      varying vec3 vWorld;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        vec2 p = vWorld.xz;
        float w1 = n(p * 1.7 + vec2(uTime * 0.35, uTime * 0.2));
        float w2 = n(p * 3.1 - vec2(uTime * 0.25, -uTime * 0.4));
        float caustic = pow(1.0 - abs(w1 - w2), 6.0);
        vec3 col = mix(uDeep, uShallow, w1 * 0.5 + 0.25) + caustic * 0.35;
        float glint = step(0.985, n(p * 9.0 + uTime * 1.2));
        col += glint * 0.6;
        gl_FragColor = vec4(col, 0.92);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
  });
}

/** Falling or spouting water on a tube or open cylinder: bright streaks streaming along its length (uv.y, or uv.x for tubes). */
export function streamMaterial(alongX = false, speed = 1.6) {
  return new ShaderMaterial({
    uniforms: { uTime: time },
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
      void main() {
        float along = ${alongX ? "vUv.x" : "vUv.y"};
        float across = ${alongX ? "vUv.y" : "vUv.x"};
        float streak = fract(along * 5.0 ${alongX ? "-" : "+"} uTime * ${speed.toFixed(2)} + sin(across * 40.0) * 0.15);
        float a = 0.18 + 0.4 * smoothstep(0.55, 1.0, streak);
        gl_FragColor = vec4(vec3(0.85, 0.95, 1.0), a);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  });
}
