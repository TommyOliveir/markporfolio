// Small deterministic 3D value noise, enough to carve cliffs and vary colour.

// Small deterministic 3D value noise, enough to carve cliffs and vary colour.
function hash(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
const ease = (t: number) => t * t * (3 - 2 * t);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => ease(Math.min(Math.max((x - a) / (b - a), 0), 1));

export function noise3(x: number, y: number, z: number) {
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

export function fbm(x: number, y: number, z: number, octaves = 4) {
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
