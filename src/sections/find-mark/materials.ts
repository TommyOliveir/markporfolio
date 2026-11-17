// The handful of materials the whole map is painted with. Everything is flat vertex colour (like the
// floating islands), with a little noise in world space so walls, lawns and paving look hand-washed
// rather than flat, plus a few patterns drawn in the shader: windows and shutters on every building,
// brick and slab paving, and lane markings on the roads.

import { Color, DoubleSide, MeshLambertMaterial, type WebGLProgramParametersWithUniforms } from "three";

/** One clock shared by every material that moves (trees in the wind, water, flags). */
export const time = { value: 0 };

const NOISE = /* glsl */ `
float fmHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float fmNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(fmHash(i), fmHash(i + vec2(1.0, 0.0)), f.x), mix(fmHash(i + vec2(0.0, 1.0)), fmHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fmFbm(vec2 p) { return fmNoise(p) * 0.55 + fmNoise(p * 2.13) * 0.3 + fmNoise(p * 4.7) * 0.15; }
`;

// Adds a world-position varying (works for plain and instanced meshes).
const WORLD_VERTEX = /* glsl */ `
  #include <begin_vertex>
  vec4 fmWorld = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    fmWorld = instanceMatrix * fmWorld;
  #endif
  fmWorld = modelMatrix * fmWorld;
  vFmWorld = fmWorld.xyz;
`;

function inject(
  shader: WebGLProgramParametersWithUniforms,
  vertexHead: string,
  vertexBody: string,
  fragHead: string,
  fragBody: string,
) {
  shader.uniforms.uTime = time;
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", `#include <common>\nuniform float uTime;\nvarying vec3 vFmWorld;\n${vertexHead}`)
    .replace("#include <begin_vertex>", WORLD_VERTEX + vertexBody);
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>\nuniform float uTime;\nvarying vec3 vFmWorld;\n${NOISE}\n${fragHead}`,
    )
    .replace("#include <color_fragment>", `#include <color_fragment>\n${fragBody}`);
}

/** Plain painted surfaces: hero buildings, props, people. A soft wash of noise over the vertex colours. */
export function paintedMaterial(strength = 0.07, side?: typeof DoubleSide) {
  const m = new MeshLambertMaterial({ vertexColors: true, ...(side ? { side } : {}) });
  m.onBeforeCompile = (shader) =>
    inject(
      shader,
      "",
      "",
      "",
      /* glsl */ `
      float wash = fmFbm(vFmWorld.xz * 0.35 + vFmWorld.y * 0.21) - 0.5;
      diffuseColor.rgb *= 1.0 + wash * ${strength.toFixed(3)} * 2.0;
    `,
    );
  m.customProgramCacheKey = () => `painted-${strength}-${side ?? 0}`;
  return m;
}

/**
 * Generic buildings. Each wall carries `aWin` = (metres along the wall, metres up from that floor's
 * floor, the wall's length, style), and the shader draws that floor's windows:
 * 0 none (roofs), 1 house (jalousie windows), 2 shopfront (roll-up shutters), 3 office windows,
 * 4 capiz-shell windows (old wooden upper floors), 5 tall arched windows (chapels).
 */
export function buildingMaterial() {
  const m = new MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = (shader) =>
    inject(
      shader,
      "attribute vec4 aWin;\nvarying vec4 vWin;",
      "vWin = aWin;",
      "varying vec4 vWin;",
      /* glsl */ `
      vec3 col = diffuseColor.rgb;
      float wash = fmFbm(vFmWorld.xz * 0.3 + vFmWorld.y * 0.4) - 0.5;
      col *= 1.0 + wash * 0.16;
      float style = vWin.w;
      if (style > 0.5) {
        float len = vWin.z;
        float bays = max(floor(len / 3.3), 1.0);
        float bay = len / bays;
        float fx = fract(vWin.x / bay);
        float cx = abs(fx - 0.5) * bay; // metres from the middle of this bay
        float fy = vWin.y;
        bool room = len > 2.3;
        // rain streaks and grime at the foot of the wall
        col *= 1.0 - 0.12 * smoothstep(0.9, 0.0, vFmWorld.y);
        col *= 1.0 - 0.05 * smoothstep(0.6, 1.0, fmNoise(vec2(vFmWorld.x * 2.0 + vFmWorld.z * 2.0, fy * 0.3)));
        // slab edge at the top of each floor
        if (fy > 2.85) col = mix(col, vec3(0.93, 0.9, 0.84), 0.55);
        vec3 glass = vec3(0.23, 0.29, 0.34);
        vec3 frame = vec3(0.96, 0.95, 0.9);
        if (room && style < 1.5) {
          // jalousie window: louvres, a pale frame and a sill
          if (cx < 0.62 && fy > 0.95 && fy < 2.25) {
            col = frame;
            if (cx < 0.52 && fy > 1.05 && fy < 2.15) col = mix(glass, vec3(0.62, 0.7, 0.72), step(0.55, fract(fy * 9.0)) * 0.6);
          }
          if (cx < 0.72 && fy > 0.86 && fy < 0.95) col = frame * 0.95;
        } else if (room && style < 2.5) {
          // shopfront: a roll-up shutter or open front, with a signboard band above
          if (cx < bay * 0.42 && fy < 2.55) {
            float shutter = step(0.5, fract(fy * 7.0));
            col = mix(vec3(0.55, 0.57, 0.58), vec3(0.68, 0.7, 0.7), shutter);
            if (fmHash(vec2(floor(vWin.x / bay), floor(len * 7.0))) > 0.45) col = vec3(0.16, 0.15, 0.14) + vec3(0.25, 0.2, 0.12) * smoothstep(0.0, 2.5, fy);
          }
          if (fy > 2.6 && fy < 2.95) col = mix(col, vec3(0.97, 0.94, 0.86), 0.7);
        } else if (room && style < 3.5) {
          if (cx < bay * 0.36 && fy > 0.8 && fy < 2.45) col = mix(glass, vec3(0.55, 0.66, 0.75), smoothstep(0.8, 2.45, fy) * 0.5);
        } else if (room && style < 4.5) {
          // capiz windows: a grid of pale shell panes in dark wood
          if (cx < bay * 0.45 && fy > 0.7 && fy < 2.4) {
            vec2 g = fract(vec2(vWin.x * 3.2, fy * 3.2));
            col = (g.x < 0.12 || g.y < 0.12) ? vec3(0.32, 0.22, 0.15) : vec3(0.95, 0.92, 0.82);
          }
        } else if (room) {
          // tall arched window
          float top = 2.4 + sqrt(max(0.0, 0.25 - cx * cx));
          if (cx < 0.5 && fy > 0.9 && fy < top) col = vec3(0.3, 0.33, 0.45) + vec3(0.12, 0.08, 0.0) * step(0.5, fract(fy * 2.5));
        }
      }
      diffuseColor.rgb = col;
    `,
    );
  m.customProgramCacheKey = () => "buildings";
  return m;
}

/**
 * The ground: one mesh for lawns, paving, plaza and roads. `aGround` = (u, v, pattern, markings):
 * pattern 0 plain earth, 1 brick paving, 2 stone slabs, 3 grass, 4 asphalt (u = metres along the road,
 * v = −1…1 across it), 5 rubber play surface, 6 gravel.
 * Road markings: 0 none, 1 dashed centre line, 2 dashed lane lines on a four-lane one-way street.
 */
export function groundMaterial() {
  const m = new MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = (shader) =>
    inject(
      shader,
      "attribute vec4 aGround;\nvarying vec4 vGround;",
      "vGround = aGround;",
      "varying vec4 vGround;",
      /* glsl */ `
      vec3 col = diffuseColor.rgb;
      vec2 w = vFmWorld.xz;
      float big = fmFbm(w * 0.045) - 0.5;
      float small = fmFbm(w * 0.9) - 0.5;
      float p = vGround.z;
      if (p < 0.5) {
        col *= 1.0 + big * 0.22 + small * 0.08;
      } else if (p < 1.5) {
        // herringbone-ish brick: running bond in 0.25 × 0.5 m bricks
        vec2 b = w / vec2(0.5, 0.25);
        b.x += step(1.0, mod(floor(b.y), 2.0)) * 0.5;
        vec2 f = fract(b);
        float grout = step(f.x, 0.06) + step(f.y, 0.1);
        float tone = fmHash(floor(b)) - 0.5;
        col *= 1.0 + tone * 0.16 + big * 0.12;
        col = mix(col, vec3(0.82, 0.76, 0.66), clamp(grout, 0.0, 1.0) * 0.55);
      } else if (p < 2.5) {
        vec2 f = fract(w / 0.9);
        float grout = step(f.x, 0.04) + step(f.y, 0.04);
        col *= 1.0 + (fmHash(floor(w / 0.9)) - 0.5) * 0.08 + big * 0.1;
        col = mix(col, col * 0.78, clamp(grout, 0.0, 1.0));
      } else if (p < 3.5) {
        // lawn: patches of lighter and darker grass, a few bare spots
        float clump = fmFbm(w * 0.25) - 0.5;
        col *= 1.0 + clump * 0.35 + small * 0.12;
        col = mix(col, vec3(0.6, 0.62, 0.32), smoothstep(0.25, 0.4, fmFbm(w * 0.08 + 7.0) - 0.25) * 0.35);
      } else if (p < 4.5) {
        col *= 1.0 + big * 0.12 + small * 0.1;
        float u = vGround.x;
        float v = vGround.y;
        // worn tyre tracks, kerb paint at the edges
        col *= 1.0 - 0.05 * smoothstep(0.25, 0.0, abs(abs(v) - 0.5));
        if (abs(v) > 0.93) col = mix(col, vec3(0.86, 0.85, 0.8), 0.8);
        float dash = step(0.5, fract(u / 6.0));
        if (vGround.w > 0.5 && vGround.w < 1.5 && abs(v) < 0.025) col = mix(col, vec3(0.95, 0.93, 0.85), dash);
        if (vGround.w > 1.5 && abs(abs(v) - 0.5) < 0.02) col = mix(col, vec3(0.95, 0.93, 0.85), dash);
      } else if (p < 5.5) {
        col *= 1.0 + small * 0.2;
      } else {
        col *= 1.0 + (fmHash(floor(w * 9.0)) - 0.5) * 0.18 + big * 0.1;
      }
      diffuseColor.rgb = col;
    `,
    );
  m.customProgramCacheKey = () => "ground";
  return m;
}

/**
 * Foliage that moves in the breeze: everything above `from` metres sways, more the higher it is.
 * Works on instanced meshes (each instance gets its own phase).
 */
export function swayMaterial(from = 0.8, amount = 0.035, side?: typeof DoubleSide) {
  const m = new MeshLambertMaterial({ vertexColors: true, ...(side ? { side } : {}) });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        #include <begin_vertex>
        vec3 swayAt = vec3(0.0);
        #ifdef USE_INSTANCING
          swayAt = instanceMatrix[3].xyz;
        #endif
        float swayH = max(position.y - ${from.toFixed(2)}, 0.0);
        float swayT = uTime * 1.4 + swayAt.x * 0.31 + swayAt.z * 0.23;
        float gust = 0.6 + 0.4 * sin(uTime * 0.37 + swayAt.x * 0.02);
        transformed.x += sin(swayT) * ${amount.toFixed(3)} * swayH * gust;
        transformed.z += cos(swayT * 0.83 + 1.3) * ${amount.toFixed(3)} * 0.7 * swayH * gust;
      `,
      );
  };
  m.customProgramCacheKey = () => `sway-${from}-${amount}-${side ?? 0}`;
  return m;
}

/** Hex string → [r, g, b] in linear colour, ready to write into a colour attribute. */
export function rgb(hex: string): [number, number, number] {
  const c = new Color(hex);
  return [c.r, c.g, c.b];
}
