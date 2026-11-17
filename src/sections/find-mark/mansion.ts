// The Yusay-Consing Mansion (Molo Mansion), 1926, in its local frame (see MANSION in world.ts:
// z = 0 is the front wall, +z looks down the drive to the fountain and the gate).
// Cream walls and white trim on a raised base; a round portico at the centre — columns below, a curved
// balcony with arched windows above, and on top a little rotunda under a red dome. Red hipped roofs,
// red hoods over the ground-floor windows, a grand staircase down to the drive.

import { ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { pyramid } from "@/sections/floating-islands/paint";
import type { Obstacles } from "./collide";
import { Kit, balustrade, roundArch } from "./kit";
import { TERRACE_HEIGHT } from "./world";

const WALL = "#f3dfc3";
const TRIM = "#fcf8f0";
const BASE = "#e6d1b0";
const ROOF = "#b8403b";
const DARK = "#3a3431";
const GLASS = "#4d5262";
const WOOD = "#6e3d22";

const G1 = TERRACE_HEIGHT; // ground floor level
const G2 = G1 + 4; // upper floor level
const EAVE = G2 + 3.8;

export function buildMansion() {
  const k = new Kit();

  // ---- the main block, wings and roofs ----------------------------------------------------------
  k.box(19, G1, 18, BASE, { z: -9 });
  k.box(19, EAVE - G1, 18, WALL, { y: G1, z: -9 });
  k.box(19.6, 0.35, 18.6, TRIM, { y: G2 - 0.2, z: -9 }); // floor band
  k.box(19.8, 0.45, 18.8, TRIM, { y: EAVE - 0.45, z: -9 }); // cornice
  k.add(pyramid(21, 20, 4.4), ROOF, { y: EAVE + 2.2, z: -9 });
  // rear service wing and the two side wings (from the footprint)
  k.box(13.9, EAVE - 0.8, 8.5, WALL, { x: 1.95, z: -22.3 });
  k.add(pyramid(14.9, 9.5, 3), ROOF, { x: 1.95, y: EAVE - 0.8 + 1.5, z: -22.3 });
  k.box(2.9, G2 + 2.6, 10.3, WALL, { x: 10.85, z: -13.85 });
  k.add(pyramid(3.9, 11.3, 1.8), ROOF, { x: 10.85, y: G2 + 2.6 + 0.9, z: -13.85 });
  k.box(2, G2 + 2.6, 8.4, WALL, { x: -10.5, z: -8 });
  k.add(pyramid(3, 9.4, 1.6), ROOF, { x: -10.5, y: G2 + 2.6 + 0.8, z: -8 });

  // windows all round the sides and back: arched above, square with red hoods below
  const sideWindows = (x: number, dir: number, z0: number, z1: number) => {
    for (let z = z0; z >= z1; z -= 3.2) {
      k.add(roundArch(1.1, 2, 0.06), GLASS, { x: x + dir * 0.03, y: G2 + 0.6, z, ry: (dir * Math.PI) / 2 });
      k.add(roundArch(1.1, 1.9, 0.06), GLASS, { x: x + dir * 0.03, y: G1 + 0.7, z, ry: (dir * Math.PI) / 2 });
    }
  };
  sideWindows(9.5, 1, -2.5, -7);
  sideWindows(-9.5, -1, -13.5, -17);
  for (let x = -7; x <= 7; x += 3.5) {
    k.add(roundArch(1.1, 2, 0.06), GLASS, { x, y: G2 + 0.6, z: -18.03, ry: Math.PI });
    k.add(roundArch(1.1, 1.9, 0.06), GLASS, { x, y: G1 + 0.7, z: -18.03, ry: Math.PI });
  }

  // ---- the front, either side of the portico --------------------------------------------------
  for (const side of [-1, 1]) {
    // pilasters
    for (const x of [3.6, 6.5, 9.4]) k.box(0.45, EAVE - G1, 0.25, TRIM, { x: side * x, y: G1, z: 0.1 });
    // a slightly projecting pediment-roof over each side bay
    k.add(pyramid(6.4, 3.2, 1.6), ROOF, { x: side * 6.5, y: EAVE + 0.8, z: 0.6 });
    k.box(6.2, 0.4, 2.4, TRIM, { x: side * 6.5, y: EAVE - 0.4, z: 0.2 });
    // upper floor: two tall arched windows, each with its own little balustraded balcony
    for (const x of [5.05, 7.95]) {
      k.add(roundArch(1.3, 2.3, 0.06), TRIM, { x: side * x, y: G2 + 0.4, z: 0.04 });
      k.add(roundArch(1.05, 2.2, 0.08), GLASS, { x: side * x, y: G2 + 0.45, z: 0.06 });
      k.box(1.7, 0.15, 0.7, TRIM, { x: side * x, y: G2 + 0.3, z: 0.35 });
      balustrade(k, 1.6, 0.85, TRIM, { x: side * x, y: G2 + 0.45, z: 0.62 });
    }
    // ground floor: an arched wooden door and a window, each under a red hood
    const door = side * 7.95;
    const win = side * 5.05;
    k.add(roundArch(1.4, 2.4, 0.08), WOOD, { x: door, y: G1, z: 0.05 });
    k.add(roundArch(1.1, 1.8, 0.08), GLASS, { x: win, y: G1 + 0.8, z: 0.05 });
    for (const x of [door, win]) {
      k.add(pyramid(1.9, 0.9, 0.5), ROOF, { x, y: G1 + 3.45, z: 0.45 });
      k.box(1.6, 0.12, 0.3, TRIM, { x, y: G1 + 3.1, z: 0.15 });
    }
    // raised terrace in front of the side bays, with a balustrade
    k.box(6.1, G1, 2.5, BASE, { x: side * 6.45, z: 1.25 });
    k.box(6.1, 0.1, 2.5, "#d9c7aa", { x: side * 6.45, y: G1, z: 1.25 });
    balustrade(k, 6, 0.95, TRIM, { x: side * 6.45, y: G1, z: 2.35 });
    balustrade(k, 2.4, 0.95, TRIM, { x: side * 9.4, y: G1, z: 1.25, ry: Math.PI / 2 });
    // potted plants on the terrace
    for (const x of [4.3, 8.6]) {
      k.cyl(0.28, 0.2, 0.45, "#b9663e", { x: side * x, y: G1, z: 1.6 }, 10);
      k.ball(0.45, "#4f8a3a", { x: side * x, y: G1 + 0.75, z: 1.6, sy: 0.9 });
    }
  }

  // ---- the round portico ---------------------------------------------------------------------
  const R = 3.4;
  // its floor: the terrace at the top of the stairs
  k.add(new CylinderGeometry(R + 0.2, R + 0.2, G1, 32, 1, false, -Math.PI / 2, Math.PI).translate(0, G1 / 2, 0), BASE);
  k.add(
    new CylinderGeometry(R + 0.2, R + 0.2, 0.06, 32, 1, false, -Math.PI / 2, Math.PI).translate(0, G1 + 0.03, 0),
    "#e9d9bd",
  );
  k.box(7, 0.06, 1, "#e9d9bd", { y: G1, z: 0.4 });
  // checkerboard tiles inside
  for (let i = -3; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const x = (i + 0.5) * 0.9;
      const z = (j + 0.5) * 0.9;
      if (Math.hypot(x, z) > R - 0.2) continue;
      k.box(0.9, 0.02, 0.9, (i + j) % 2 ? "#9c3b30" : "#f3ece0", { x, y: G1 + 0.06, z });
    }
  // columns on the curve
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / 6) * Math.PI;
    const x = Math.sin(a) * R;
    const z = Math.cos(a) * R;
    k.cyl(0.32, 0.34, 0.3, TRIM, { x, y: G1, z }, 12);
    k.cyl(0.2, 0.23, 3.2, TRIM, { x, y: G1 + 0.3, z }, 12);
    k.box(0.55, 0.22, 0.55, TRIM, { x, y: G1 + 3.5, z, ry: a });
  }
  // the curved band over the columns, and the main door behind
  k.add(
    new CylinderGeometry(R + 0.3, R + 0.3, 0.55, 32, 1, true, -Math.PI / 2, Math.PI).translate(0, G2 - 0.3, 0),
    TRIM,
  );
  k.add(new CylinderGeometry(R + 0.35, R + 0.35, 0.12, 32, 1, false, -Math.PI / 2, Math.PI).translate(0, G2, 0), TRIM);
  k.add(roundArch(1.8, 2.6, 0.1), WOOD, { y: G1, z: 0.06 });
  k.add(roundArch(2.3, 2.75, 0.06), TRIM, { y: G1, z: 0.03 });
  k.add(roundArch(1, 1.8, 0.08), GLASS, { x: -2.3, y: G1 + 0.8, z: 0.05 });
  k.add(roundArch(1, 1.8, 0.08), GLASS, { x: 2.3, y: G1 + 0.8, z: 0.05 });

  // upper floor of the bay: curved wall with arched windows, and a curved balcony
  k.add(
    new CylinderGeometry(R - 0.1, R - 0.1, EAVE - G2, 32, 1, true, -Math.PI / 2, Math.PI).translate(
      0,
      (EAVE - G2) / 2 + G2,
      0,
    ),
    WALL,
  );
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 3 + (i * Math.PI) / 3;
    const x = Math.sin(a) * (R - 0.05);
    const z = Math.cos(a) * (R - 0.05);
    k.add(roundArch(1.1, 2.1, 0.08), GLASS, { x, y: G2 + 0.5, z, ry: a });
    k.add(roundArch(1.4, 2.2, 0.05), TRIM, { x: x * 0.995, y: G2 + 0.4, z: z * 0.995, ry: a });
  }
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i / 3) * Math.PI;
    k.box(0.4, EAVE - G2, 0.3, TRIM, { x: Math.sin(a) * (R - 0.02), y: G2, z: Math.cos(a) * (R - 0.02), ry: a });
  }
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / 9) * Math.PI;
    balustrade(k, 1.15, 0.9, TRIM, { x: Math.sin(a) * (R + 0.15), y: G2 + 0.1, z: Math.cos(a) * (R + 0.15), ry: a });
  }
  k.add(
    new CylinderGeometry(R + 0.25, R + 0.25, 0.4, 32, 1, false, -Math.PI / 2, Math.PI).translate(0, EAVE - 0.2, 0),
    TRIM,
  );
  k.add(
    new CylinderGeometry(R + 0.1, R + 0.1, 0.1, 32, 1, false, -Math.PI / 2, Math.PI).translate(0, EAVE + 0.05, 0),
    "#d9c7aa",
  );

  // the rotunda on top, ringed by a balustrade, under the red dome
  const top = EAVE + 0.1;
  const rr = 2.3;
  k.cyl(rr, rr, 3, WALL, { y: top, z: 0.2 }, 24);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.add(roundArch(0.8, 1.3, 0.08), GLASS, {
      x: Math.sin(a) * (rr + 0.02),
      y: top + 0.7,
      z: 0.2 + Math.cos(a) * (rr + 0.02),
      ry: a,
    });
    const b = a + Math.PI / 6;
    k.box(0.3, 3, 0.2, TRIM, { x: Math.sin(b) * (rr + 0.05), y: top, z: 0.2 + Math.cos(b) * (rr + 0.05), ry: b });
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    balustrade(k, 1.6, 0.8, TRIM, { x: Math.sin(a) * 3.05, y: top, z: 0.2 + Math.cos(a) * 3.05, ry: a });
  }
  k.cyl(rr + 0.3, rr + 0.3, 0.35, TRIM, { y: top + 3, z: 0.2 }, 24);
  k.add(new SphereGeometry(rr + 0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1), ROOF, {
    y: top + 3.35,
    z: 0.2,
  });
  k.add(new TorusGeometry(rr + 0.22, 0.08, 6, 24).rotateX(Math.PI / 2), TRIM, { y: top + 3.4, z: 0.2 });
  k.cyl(0.08, 0.12, 1.4, DARK, { y: top + 5, z: 0.2 }, 6); // finial and weathervane
  k.ball(0.18, "#c9a046", { y: top + 5.6, z: 0.2 });
  k.box(1, 0.06, 0.06, DARK, { y: top + 6.1, z: 0.2 });
  k.add(new ConeGeometry(0.12, 0.3, 4).rotateZ(-Math.PI / 2), DARK, { x: 0.6, y: top + 6.13, z: 0.2 });

  // ---- the grand staircase -------------------------------------------------------------------
  const steps = 9;
  const z0 = R - 0.1;
  const z1 = 7.2;
  const run = (z1 - z0) / steps;
  for (let i = 0; i < steps; i++) {
    const h = G1 - (i + 1) * (G1 / steps);
    k.box(6.6, h + G1 / steps, run, i % 2 ? "#ece0cb" : "#e4d6be", { z: z0 + (i + 0.5) * run });
  }
  for (const side of [-1, 1]) {
    // stepped cheek walls with balusters, ending in pedestals with urns
    for (let i = 0; i < steps; i++) {
      const h = G1 - i * (G1 / steps);
      k.box(0.45, h + 0.15, run, BASE, { x: side * 3.45, z: z0 + (i + 0.5) * run });
      k.cyl(0.05, 0.07, 0.75, TRIM, { x: side * 3.45, y: h + 0.15, z: z0 + (i + 0.5) * run }, 6);
    }
    k.box(0.6, 0.85, 0.6, TRIM, { x: side * 3.45, z: z1 + 0.1 });
    k.add(new CylinderGeometry(0.28, 0.16, 0.45, 12).translate(0, 0.22, 0), TRIM, {
      x: side * 3.45,
      y: 0.85,
      z: z1 + 0.1,
    });
    k.ball(0.18, "#5b8f3d", { x: side * 3.45, y: 1.45, z: z1 + 0.1 });
    k.box(0.6, 0.6, 0.6, TRIM, { x: side * 3.45, y: G1, z: z0 - 0.2 });
    k.add(new CylinderGeometry(0.26, 0.15, 0.42, 12).translate(0, 0.21, 0), TRIM, {
      x: side * 3.45,
      y: G1 + 0.6,
      z: z0 - 0.2,
    });
  }

  return k.build()!;
}

// The reflecting pool in the middle of the roundabout, with its hedges and flower beds (map coordinates).
export function buildReflectingPool(cx: number, cz: number, facing: number, obstacles: Obstacles) {
  obstacles.addCircle(cx, cz, 2.95, 0.7);
  const k = new Kit();
  k.add(new CylinderGeometry(6, 6, 0.08, 40), "#86b356", { x: cx, y: 0.03, z: cz });
  k.cyl(2.7, 2.8, 0.55, "#ede3d1", { x: cx, z: cz }, 40);
  k.add(new TorusGeometry(2.72, 0.12, 6, 40).rotateX(Math.PI / 2), "#f7f1e6", { x: cx, y: 0.56, z: cz });
  k.cyl(0.35, 0.5, 0.7, "#f2ebdf", { x: cx, z: cz }, 16);
  k.cyl(0.9, 0.3, 0.2, "#f2ebdf", { x: cx, y: 0.7, z: cz }, 16);
  // hedges in a broken ring: gaps on the axis toward the house and the gate
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const off = Math.abs(Math.sin(a - facing));
    if (off < 0.32) continue; // the gaps (axis runs along `facing`)
    const r = 4.7;
    k.box(1.15, 0.85, 0.85, i % 2 ? "#3f7a34" : "#467f37", {
      x: cx + Math.sin(a) * r,
      z: cz + Math.cos(a) * r,
      ry: a,
      sy: 0.9 + (i % 3) * 0.08,
    });
    obstacles.addCircle(cx + Math.sin(a) * r, cz + Math.cos(a) * r, 0.6, 1);
    if (i % 3 === 0)
      k.ball(0.32, i % 2 ? "#d9467a" : "#f2c14e", { x: cx + Math.sin(a) * 3.6, y: 0.25, z: cz + Math.cos(a) * 3.6 });
  }
  return k.build()!;
}
