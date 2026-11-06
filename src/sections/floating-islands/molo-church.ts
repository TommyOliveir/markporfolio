// Molo Church and Molo Plaza in miniature, on their own rock.

import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  SphereGeometry,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { cross, gable, paint, pyramid } from "./paint";

// St. Anne Parish Church in Molo, Iloilo, in miniature. Details from descriptions of the real church:
// warm cream coral-stone facade framed by twin bell towers; square lower tiers with decorated corners
// rising to octagonal belfries pierced alternately with lancet and round windows, under tall deep-red
// spires; two cornices across the front, Tuscan pilasters, a rose window, an arched niche with the
// Sta. Ana mosaic, a pediment with its own niche and crucifix and little pinnacles; a deep-red roof
// and a red dome over the crossing. In front of it, Molo Plaza (see below). The facade faces +z;
// `base` is the height of the rock's top.
export function buildChurch(base: number) {
  const parts: BufferGeometry[] = [];
  const add = (geo: BufferGeometry, color: string, x = 0, y = 0, z = 0, turn = 0) =>
    // non-indexed throughout, so the icosahedron leaves merge with the boxes and cones
    parts.push(paint((geo.index ? geo.toNonIndexed() : geo).rotateY(turn).translate(x, y, z), color));
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

  // The church is built at ground level, then scaled down a little and set at the back of the
  // island so the plaza fits in front of it.
  const S = 0.75;
  const ground = base + 0.02; // top of the stone platform
  const church = mergeGeometries(parts)
    .scale(S, S, S)
    .translate(0, ground + 0.008, -0.2 - zF * S);

  // Molo Plaza, from descriptions of the restored square: a long rectangle in front of the church with
  // a road on all four sides; brick paving; a main walk on the axis from the church door; a scalloped
  // fountain at the centre between two round gardens; lawns in low white walls either side; the white domed rotunda on one side, with six goddess statues on a red-and-white
  // checkerboard floor; the Maria Clara monument facing the fountain; lamp posts along the walk.
  const plaza: BufferGeometry[] = [church];
  const put = (geo: BufferGeometry, color: string, x = 0, y = 0, z = 0, turn = 0) =>
    plaza.push(paint((geo.index ? geo.toNonIndexed() : geo).rotateY(turn).translate(x, ground + y, z), color));
  const white = "#f1ece1";
  const top = 0.012; // plaza surface, above the platform
  const fz = 0.165; // fountain, at the middle of the square

  put(new CylinderGeometry(0.69, 0.66, 0.1, 44), "#d4cab6", 0, -0.05, 0); // stone platform set into the rock
  put(new BoxGeometry(0.64, 0.006, 1.08), "#5d5d61", 0, 0.003, -0.04); // perimeter road
  put(new BoxGeometry(0.5, 0.008, 0.38), "#ddd5c4", 0, 0.004, -0.37); // churchyard
  put(new BoxGeometry(0.52, 0.012, 0.55), "#b8694d", 0, 0.006, fz); // brick-paved square
  for (let z = -0.095; z < 0.44; z += 0.025) put(new BoxGeometry(0.1, 0.002, 0.003), "#9a523b", 0, top + 0.001, z); // brick courses

  for (const x of [-0.15, 0.15])
    for (const z of [0.015, 0.315]) {
      put(new BoxGeometry(0.19, 0.012, 0.22), white, x, top + 0.006, z); // low white wall
      put(new BoxGeometry(0.176, 0.014, 0.206), "#4c8a3c", x, top + 0.007, z); // lawn
    }

  // scalloped fountain
  put(new CylinderGeometry(0.05, 0.054, 0.022, 24), white, 0, top + 0.011, fz);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    put(new SphereGeometry(0.012, 10, 6), white, Math.sin(a) * 0.05, top + 0.02, fz + Math.cos(a) * 0.05);
  }
  put(new CylinderGeometry(0.044, 0.044, 0.004, 24), "#6fb3d9", 0, top + 0.022, fz); // water
  put(new CylinderGeometry(0.008, 0.011, 0.05, 8), white, 0, top + 0.045, fz);
  put(new CylinderGeometry(0.024, 0.012, 0.012, 12), white, 0, top + 0.072, fz); // upper bowl
  put(new ConeGeometry(0.01, 0.035, 8), "#d5ecf7", 0, top + 0.095, fz); // spray

  // the two round gardens either side of the fountain, on the axis
  for (const z of [fz - 0.13, fz + 0.13]) {
    put(new CylinderGeometry(0.036, 0.036, 0.014, 24), white, 0, top + 0.007, z);
    put(new CylinderGeometry(0.03, 0.03, 0.018, 24), "#4c8a3c", 0, top + 0.009, z);
    put(new IcosahedronGeometry(0.016, 1).scale(1, 0.8, 1), "#2f6b2a", 0, top + 0.026, z);
  }

  // the rotunda, on one side of the fountain
  const rx = -0.15;
  put(new CylinderGeometry(0.046, 0.048, 0.01, 24), white, rx, top + 0.005, fz); // step
  for (let i = -3; i < 3; i++)
    for (let j = -3; j < 3; j++) {
      const cx = (i + 0.5) * 0.012;
      const cz = (j + 0.5) * 0.012;
      if (Math.hypot(cx, cz) > 0.036) continue;
      put(new BoxGeometry(0.012, 0.002, 0.012), (i + j) % 2 ? "#b23a32" : "#f7f3ea", rx + cx, top + 0.011, fz + cz); // checkerboard
    }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    put(
      new CylinderGeometry(0.0035, 0.004, 0.056, 8),
      white,
      rx + Math.sin(a) * 0.038,
      top + 0.038,
      fz + Math.cos(a) * 0.038,
    );
    const g = a + Math.PI / 6; // a goddess between each pair of columns
    put(new ConeGeometry(0.006, 0.026, 8), "#faf8f2", rx + Math.sin(g) * 0.022, top + 0.025, fz + Math.cos(g) * 0.022);
    put(new SphereGeometry(0.0045, 8, 6), "#faf8f2", rx + Math.sin(g) * 0.022, top + 0.041, fz + Math.cos(g) * 0.022);
  }
  put(new CylinderGeometry(0.044, 0.044, 0.008, 24), white, rx, top + 0.07, fz); // entablature
  put(new SphereGeometry(0.042, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), "#f7f3ea", rx, top + 0.074, fz); // dome
  put(new SphereGeometry(0.006, 8, 6), white, rx, top + 0.118, fz); // finial

  // Maria Clara monument, at the front end of the walk, facing the fountain
  put(new BoxGeometry(0.03, 0.03, 0.03), "#e6dfd0", 0, top + 0.015, 0.405);
  put(new ConeGeometry(0.011, 0.04, 10), "#faf8f2", 0, top + 0.05, 0.405); // her gown
  put(new SphereGeometry(0.006, 8, 6), "#faf8f2", 0, top + 0.074, 0.405);

  // lamp posts along the walk
  for (const x of [-0.057, 0.057])
    for (const z of [-0.06, 0.05, 0.28, 0.38]) {
      put(new CylinderGeometry(0.0022, 0.003, 0.05, 6), "#2f2a2a", x, top + 0.025, z);
      put(new SphereGeometry(0.0065, 8, 6), "#ffe6a6", x, top + 0.053, z);
    }

  // Around the square, in place of bare platform: Molo Mansion across the plaza from the church
  // (cream, two storeys, red roof, an arcade of columns), a row of old stone-and-wood heritage
  // houses on the other side. (No trees here, so nothing hides the church.) Each building is drawn facing +z, then turned.
  const building = (x: number, z: number, turn: number, pieces: [BufferGeometry, string][]) =>
    pieces.forEach(([g, color]) => put(g, color, x, 0, z, turn));
  const block = (w: number, h: number, d: number, y: number) => new BoxGeometry(w, h, d).translate(0, y + h / 2, 0);

  const mansion: [BufferGeometry, string][] = [
    [block(0.2, 0.065, 0.13, 0), "#efe4c8"],
    [block(0.21, 0.06, 0.14, 0.065), "#f6eedb"],
    [pyramid(0.23, 0.155, 0.07).translate(0, 0.16, 0), "#b8443a"],
    [block(0.04, 0.05, 0.004, 0).translate(0, 0, 0.067), "#3a2c25"], // door
  ];
  for (let k = 0; k < 5; k++) {
    const x = -0.08 + k * 0.04;
    mansion.push([new CylinderGeometry(0.004, 0.004, 0.065, 8).translate(x, 0.0325, 0.072), "#fbf8f1"]); // arcade
    mansion.push([block(0.018, 0.03, 0.004, 0.08).translate(x, 0, 0.071), "#3a3530"]); // upper windows
  }
  building(0.47, 0.22, -Math.PI / 2, mansion);

  const roofs = ["#b8443a", "#6b5a4e", "#9a4a2e"];
  [-0.12, 0.08, 0.28].forEach((z, i) =>
    building(-0.45, z, Math.PI / 2, [
      [block(0.12, 0.05, 0.1, 0), "#e3d5b8"], // stone ground floor
      [block(0.13, 0.045, 0.11, 0.05), "#8a5a3b"], // wooden upper floor
      [block(0.11, 0.02, 0.004, 0.062).translate(0, 0, 0.056), "#f4ead0"], // capiz window band
      [block(0.03, 0.04, 0.004, 0).translate(0, 0, 0.051), "#3a2c25"],
      [pyramid(0.15, 0.13, 0.05).translate(0, 0.12, 0), roofs[i]],
    ]),
  );

  return mergeGeometries(plaza);
}
