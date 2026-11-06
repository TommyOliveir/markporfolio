// The floating city: a cathedral, a clock tower and a ring of houses with lit windows.

import { BoxGeometry, CircleGeometry, ConeGeometry, Matrix4, SphereGeometry, type BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { seeded } from "@/lib/seeded";
import { paint, pyramid } from "./paint";

const walls = ["#f4d78f", "#efe2c8", "#e8b98a", "#d9c7b0", "#f2c6b4", "#cfd9dd"];
const roofs = ["#b8443a", "#c8573f", "#8c3b35", "#2f5f6b", "#d63c62", "#9a4a2e"];

// A little hilltop town: a cathedral with twin spires and a dome at the centre, a clock tower,
// and a ring of tile-roofed houses, every one with warm lit windows. `base` is the plateau height.
export function buildCity(rand: ReturnType<typeof seeded>, base: number, radius: number) {
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
