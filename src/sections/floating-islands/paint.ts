// Shared shape helpers for the buildings: flat-colour painting, pyramid and gable roofs, crosses.

import { BoxGeometry, BufferAttribute, Color, ConeGeometry, CylinderGeometry, type BufferGeometry } from "three";

// Bakes a flat colour into a part so the whole city can share one mesh and one material.
export function paint(geo: BufferGeometry, hex: string) {
  const c = new Color(hex);
  const n = geo.getAttribute("position").count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return geo;
}

// Square pyramid roof sized to a w × d footprint.
export function pyramid(w: number, d: number, h: number) {
  return new ConeGeometry(w / Math.SQRT2, h, 4).rotateY(Math.PI / 4).scale(1, 1, d / w);
}

// A gable roof: a triangular prism running front to back, `w` wide and `h` tall, sitting on y = 0.
export function gable(w: number, h: number, depth: number) {
  const r = w / Math.sqrt(3);
  return new CylinderGeometry(r, r, depth, 3)
    .rotateX(-Math.PI / 2)
    .translate(0, r / 2, 0)
    .scale(1, h / (1.5 * r), 1);
}

// Small cross: an upright and an arm.
export function cross(size: number) {
  return [
    new BoxGeometry(size * 0.18, size, size * 0.18),
    new BoxGeometry(size * 0.6, size * 0.18, size * 0.18).translate(0, size * 0.18, 0),
  ];
}
