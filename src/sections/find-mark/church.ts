// St. Anne Parish Church (Molo Church) at full size, laid out on its real footprint (see CHURCH in
// world.ts: local z = 0 is the facade, +z looks out over the plaza). Gothic-Renaissance in pale coral
// stone: a nave with lower side aisles, buttresses topped with pinnacles and lancet windows between
// them, a transept and sanctuary at the back, and the facade with its twin towers — square below,
// octagonal belfries above, under tall red spires — a pointed portal, rose window and pediment.

import { CircleGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from "three";
import { cross, gable } from "@/sections/floating-islands/paint";
import { Kit, lancet } from "./kit";

const STONE = "#e7dbc1";
const TRIM = "#f6f0e2";
const RED = "#a8322b";
const DARK = "#2b2a32";
const GLASS = "#3d4b7c";
const WOOD = "#5b3a26";

export function buildChurch() {
  const k = new Kit();

  // ---- nave, aisles and their roofs -------------------------------------------------------------
  const zBack = -51.5;
  const zFront = -6.5; // where the facade block starts
  const naveLen = zFront - zBack;
  const naveMid = (zFront + zBack) / 2;
  k.box(13, 15, naveLen, STONE, { z: naveMid });
  k.add(gable(14.2, 7, naveLen + 0.6), RED, { y: 15, z: naveMid });
  for (const side of [-1, 1]) {
    k.box(7.7, 9.5, naveLen, STONE, { x: side * 10.35, z: naveMid });
    // lean-to aisle roof from the nave wall down over the aisle
    const run = 8.3;
    const angle = Math.atan2(3.4, 7.7);
    k.box(run, 0.3, naveLen + 0.6, RED, { x: side * 10.5, y: 9.4 + 1.7 - 0.15, z: naveMid, rz: -side * angle });
    // clerestory: little round windows above the aisle roof
    for (let z = zFront - 4; z > zBack + 2; z -= 5.6)
      k.add(new CircleGeometry(0.55, 16), DARK, { x: side * 6.52, y: 13.9, z, ry: side * (Math.PI / 2) });
    // buttresses with pinnacles, lancet windows between
    for (let z = zFront - 2.5; z >= zBack + 1; z -= 5.6) {
      k.box(1.1, 9, 0.9, TRIM, { x: side * 14.6, z });
      k.box(0.8, 1.2, 0.7, TRIM, { x: side * 14.55, y: 9, z });
      k.add(new ConeGeometry(0.4, 2.4, 4).translate(0, 1.2, 0), TRIM, { x: side * 14.55, y: 10.2, z, ry: Math.PI / 4 });
      if (z - 2.8 > zBack + 0.5) {
        k.add(lancet(1.3, 3.6, 0.08), GLASS, { x: side * 14.24, y: 3.2, z: z - 2.8, ry: side * (Math.PI / 2) });
        k.box(1.7, 0.15, 0.3, TRIM, { x: side * 14.3, y: 3.05, z: z - 2.8, ry: Math.PI / 2 }); // sill
      }
    }
    k.box(0.3, 0.35, naveLen, TRIM, { x: side * 14.25, y: 9.2, z: naveMid }); // eaves cornice
  }

  // ---- transept, crossing dome and sanctuary ---------------------------------------------------
  const tz0 = -68.2;
  const tz1 = -51.3;
  const tx0 = -21.9;
  const tx1 = 27.6;
  const tMid = (tz0 + tz1) / 2;
  const tLen = tx1 - tx0;
  k.box(tLen, 15, tz1 - tz0, STONE, { x: (tx0 + tx1) / 2, z: tMid });
  k.add(gable(tz1 - tz0 + 1.2, 6.8, tLen + 0.6), RED, { x: (tx0 + tx1) / 2, y: 15, z: tMid, ry: Math.PI / 2 });
  for (const [x, dir] of [
    [tx0, -1],
    [tx1, 1],
  ]) {
    // gable ends: a big rose window over three lancets, and corner buttresses
    k.add(new CircleGeometry(2.1, 24), TRIM, { x: x + dir * 0.03, y: 10.5, z: tMid, ry: (dir * Math.PI) / 2 });
    k.add(new CircleGeometry(1.75, 24), GLASS, { x: x + dir * 0.05, y: 10.5, z: tMid, ry: (dir * Math.PI) / 2 });
    for (const dz of [-2.4, 0, 2.4])
      k.add(lancet(1.1, 3.2, 0.08), GLASS, { x: x + dir * 0.05, y: 3, z: tMid + dz, ry: (dir * Math.PI) / 2 });
    for (const z of [tz0, tz1]) {
      k.box(1.2, 15.5, 1.2, TRIM, { x, z });
      k.add(new ConeGeometry(0.5, 2.6, 4).translate(0, 1.3, 0), TRIM, { x, y: 15.5, z, ry: Math.PI / 4 });
    }
  }
  // drum and red dome over the crossing
  const cz = (tz0 + tz1) / 2;
  k.add(new CylinderGeometry(4.4, 4.6, 5, 8).translate(0, 2.5, 0), STONE, { y: 19.5, z: cz });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    k.add(lancet(0.8, 1.6, 0.1), DARK, { x: Math.sin(a) * 4.3, y: 20.6, z: cz + Math.cos(a) * 4.3, ry: a });
  }
  k.add(new CylinderGeometry(4.9, 4.9, 0.4, 8), TRIM, { y: 24.5, z: cz });
  k.add(new SphereGeometry(4.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), RED, { y: 24.7, z: cz });
  k.cyl(0.5, 0.6, 1.6, TRIM, { y: 29.1, z: cz }, 8); // lantern
  cross(2.2).forEach((g) => k.add(g, DARK, { y: 31.6, z: cz }));

  // sanctuary at the very back
  const az0 = -78.5;
  k.box(26.7, 13, tz0 - az0 + 0.4, STONE, { x: 0.15, z: (az0 + tz0) / 2 });
  k.add(gable(27.4, 6, tz0 - az0 + 1), RED, { x: 0.15, y: 13, z: (az0 + tz0) / 2 });
  for (const x of [-9, -3, 3, 9]) k.add(lancet(1.1, 3.2, 0.08), GLASS, { x, y: 3.2, z: az0 - 0.25, ry: Math.PI });

  // ---- facade -----------------------------------------------------------------------------------
  const fz = 0.3; // the facade's face
  const fd = fz - zFront;
  k.box(14.4, 17.5, fd, STONE, { z: zFront + fd / 2 });
  // pediment, with little pinnacles up its rakes and a cross at the top
  k.add(gable(14.4, 6.2, 1.2), STONE, { y: 17.5, z: fz - 0.6 });
  k.add(gable(15.2, 6.6, 0.4), TRIM, { y: 17.4, z: fz + 0.1 });
  for (const t of [-1, -0.5, 0.5, 1]) {
    const x = t * 7;
    const y = 17.5 + (1 - Math.abs(t)) * 6.2;
    k.add(new ConeGeometry(0.28, 1.6, 4).translate(0, 0.8, 0), TRIM, { x, y, z: fz, ry: Math.PI / 4 });
  }
  cross(2.4).forEach((g) => k.add(g, DARK, { y: 24.8, z: fz - 0.6 }));
  // niche in the pediment, with a statue of St. Anne
  k.add(lancet(1.2, 1.4, 0.1), DARK, { y: 18.6, z: fz + 0.05 });
  k.cyl(0.22, 0.35, 1.3, TRIM, { y: 18.7, z: fz + 0.05 }, 8);
  k.ball(0.18, TRIM, { y: 20.15, z: fz + 0.05 });

  // two cornices right across the front, towers included
  for (const y of [7.6, 14.6]) k.box(29.4, 0.45, 1.1, TRIM, { y, z: fz - 0.2 });
  // pilasters
  for (const x of [-7.2, -3.6, 3.6, 7.2]) k.box(0.7, 17.5, 0.3, TRIM, { x, z: fz + 0.15 });
  // rose window with tracery
  k.add(new CircleGeometry(2.5, 32), TRIM, { y: 11.2, z: fz + 0.04 });
  k.add(new CircleGeometry(2.1, 32), GLASS, { y: 11.2, z: fz + 0.07 });
  for (let i = 0; i < 6; i++) k.box(4.2, 0.12, 0.08, TRIM, { y: 11.2 - 0.06, z: fz + 0.1, rz: (i / 6) * Math.PI });
  k.add(new CircleGeometry(0.5, 16), TRIM, { y: 11.2, z: fz + 0.12 });
  // Sta. Ana mosaic in its niche above the rose window
  k.box(2.2, 1.9, 0.12, "#3f6fa6", { y: 15.3, z: fz + 0.06 });
  k.add(new CircleGeometry(0.75, 16, 0, Math.PI), "#d9a441", { y: 17.2, z: fz + 0.13 });
  // statues of saints in niches either side of the portal
  for (const x of [-5.4, 5.4]) {
    k.add(lancet(1.2, 2.6, 0.1), DARK, { x, y: 2.2, z: fz + 0.05 });
    k.box(1.3, 0.2, 0.5, TRIM, { x, y: 2.05, z: fz + 0.2 });
    k.cyl(0.24, 0.38, 1.7, "#f3eee4", { x, y: 2.25, z: fz + 0.12 }, 8);
    k.ball(0.2, "#f3eee4", { x, y: 4.15, z: fz + 0.12 });
    k.add(lancet(1.1, 2.6, 0.08), GLASS, { x, y: 9, z: fz + 0.05 });
  }

  // the portal: a gabled porch with a deep pointed arch and the wooden doors
  k.box(8.4, 7.4, 1.5, STONE, { z: fz + 0.75 });
  k.add(gable(8.8, 2.6, 1.6), TRIM, { y: 7.4, z: fz + 0.75 });
  k.add(lancet(4.6, 4.4, 0.1), TRIM, { y: 0, z: fz + 1.52 });
  k.add(lancet(3.7, 4.0, 0.12), WOOD, { y: 0, z: fz + 1.55 });
  k.box(0.08, 4.6, 0.14, "#3a2416", { y: 0, z: fz + 1.58 }); // where the doors meet
  for (const x of [-4.2, 4.2]) {
    k.box(0.7, 7.4, 0.7, TRIM, { x, z: fz + 1.5 });
    k.add(new ConeGeometry(0.4, 1.8, 4).translate(0, 0.9, 0), TRIM, { x, y: 7.4, z: fz + 1.5, ry: Math.PI / 4 });
  }
  cross(1.2).forEach((g) => k.add(g, DARK, { y: 10.6, z: fz + 0.75 }));
  // front steps
  for (let i = 0; i < 3; i++)
    k.box(12 - i * 0.6, 0.15, 2.7 - i * 0.9, "#d9cfbd", { y: i * 0.15, z: fz + 1.5 + (2.7 - i * 0.9) / 2 });

  // ---- twin bell towers --------------------------------------------------------------------------
  for (const side of [-1, 1]) {
    const x = side * 10.7;
    const tz = zFront + fd / 2 - 0.2;
    k.box(7, 21.5, 7.2, STONE, { x, z: tz });
    // decorated corners running up to little pinnacles
    for (const dx of [-1, 1])
      for (const dz of [-1, 1]) {
        k.box(0.8, 22.4, 0.8, TRIM, { x: x + dx * 3.4, z: tz + dz * 3.5 });
        k.add(new ConeGeometry(0.42, 2, 4).translate(0, 1, 0), TRIM, {
          x: x + dx * 3.4,
          y: 22.4,
          z: tz + dz * 3.5,
          ry: Math.PI / 4,
        });
      }
    // windows on each tier, front and outer side
    for (const [y, w, h] of [
      [2.5, 1.2, 3],
      [9.2, 1.1, 3.2],
      [16, 1.3, 3.6],
    ]) {
      k.add(lancet(w, h, 0.08), DARK, { x, y, z: fz + 0.04 });
      k.add(lancet(w, h, 0.08), DARK, { x: x + side * 3.52, y, z: tz, ry: side * (Math.PI / 2) });
    }
    k.box(7.8, 0.5, 8, TRIM, { x, y: 21.5, z: tz }); // cornice
    // octagonal belfry: lancet and round openings in turn
    k.add(new CylinderGeometry(2.9, 3.1, 6.8, 8).translate(0, 3.4, 0), STONE, { x, y: 22, z: tz, ry: Math.PI / 8 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 2.95;
      if (i % 2)
        k.add(new CircleGeometry(0.75, 16), DARK, { x: x + Math.sin(a) * r, y: 25.6, z: tz + Math.cos(a) * r, ry: a });
      else k.add(lancet(0.95, 2.4, 0.1), DARK, { x: x + Math.sin(a) * r, y: 23.4, z: tz + Math.cos(a) * r, ry: a });
    }
    // a bell, just visible
    k.add(new CylinderGeometry(0.35, 0.75, 1.1, 12).translate(0, 0.55, 0), "#8c6a2f", { x, y: 24.2, z: tz });
    k.add(new CylinderGeometry(3.4, 3.4, 0.45, 8), TRIM, { x, y: 29, z: tz, ry: Math.PI / 8 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      k.add(new ConeGeometry(0.22, 1.4, 4).translate(0, 0.7, 0), TRIM, {
        x: x + Math.sin(a) * 3.1,
        y: 29.2,
        z: tz + Math.cos(a) * 3.1,
      });
    }
    k.add(new ConeGeometry(3.1, 12, 8).translate(0, 6, 0), RED, { x, y: 29.2, z: tz, ry: Math.PI / 8 }); // spire
    k.ball(0.3, TRIM, { x, y: 41.3, z: tz });
    cross(1.8).forEach((g) => k.add(g, DARK, { x, y: 42.4, z: tz }));
  }

  return k.build()!;
}
