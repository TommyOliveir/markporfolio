// Inside St. Anne's (Molo Church), in the church's own frame (see CHURCH in world.ts and church.ts:
// local z = 0 is the facade, +z looks out over the plaza, -z runs up the nave to the altar).
//
// You come in through the open portal and a low passage under the choir loft (with the organ), into a
// cream Gothic nave: pointed arches on two rows of columns, lower side aisles, stained-glass lancets.
// On each column stands one of the sixteen female saints Molo Church is known for, eight a side. Wooden
// pews either side of a red carpet lead up to the crossing and the sanctuary, where a white-and-gold
// Gothic altarpiece holds St. Anne. Chandeliers hang down the nave.
//
// The interior is its own mesh, shown only while the camera is inside (the outside of the church is
// hidden then). Its walls are thin slabs, so they read from inside; the collision walls, the floor
// heights and the ceilings the camera keeps under are exported from here too.

import { BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { cross } from "@/sections/floating-islands/paint";
import type { Obstacles } from "./collide";
import { Kit, lancet } from "./kit";
import { CHURCH, toWorld } from "./world";

const WALL = "#efe6d3";
const TRIM = "#f8f3e8";
const GOLD = "#c9a24a";
const FLOOR = "#d9cdb6";
const WOOD = "#6b4429";
const CARPET = "#8e2230";
const SKIN = "#e8c6a2";

/** The church's plan, in local metres. */
export const PLAN = {
  /** the doorway through the porch and facade */
  doorHalf: 1.85,
  doorHeight: 4.2,
  /** the front of the porch (where the doorway starts) and the inside face of the facade */
  porch: 1.8,
  facade: 0.3,
  /** where the passage under the choir loft opens into the nave */
  narthex: -6.5,
  /** nave and aisles */
  nave: 6.5,
  aisle: 14.2,
  /** transept: front and back, left and right ends */
  tz1: -51.3,
  tz0: -68.2,
  tx0: -21.9,
  tx1: 27.6,
  /** sanctuary: back wall and sides */
  az0: -78.5,
  ax0: -13.2,
  ax1: 13.5,
  /** the raised floor of the sanctuary starts here */
  step: -70.5,
};

export const FLOOR_Y = 0.45;
const SANCTUARY_Y = 0.75;
const CAPITAL = 7; // top of the column capitals, where the arches spring
const APEX = 9; // the arches' points, the aisle ceilings and the foot of the upper nave walls
const NAVE_CEILING = 13;
const SANCTUARY_CEILING = 12;
// the inside walls stand this far in from the outline, so none of them pokes through the outside walls
const IN = 0.2;

// eight columns a side, so sixteen saints
const COLUMNS = Array.from({ length: 8 }, (_, i) => -9.5 - (i * 39) / 7);
// rows of pews, far enough apart to walk between, and how far they reach either side of the carpet
const PEWS = Array.from({ length: 26 }, (_, i) => -12 - i * 1.35);
const PEW_IN = 1.25;
const PEW_OUT = 5.15; // leaves room to walk between the pews and the columns

/** Is a local point inside the church (the passage, nave, aisles, transept or sanctuary)? */
export function insideLocal(lx: number, lz: number) {
  const P = PLAN;
  if (lz > P.porch || lz < P.az0) return false;
  if (lz > P.narthex) return Math.abs(lx) < P.doorHalf;
  if (lz > P.tz1) return Math.abs(lx) < P.aisle;
  if (lz > P.tz0) return lx > P.tx0 && lx < P.tx1;
  return lx > P.ax0 && lx < P.ax1;
}

/** The floor height inside (the sanctuary is up a step), or null outside. */
export function floorLocal(lx: number, lz: number) {
  if (!insideLocal(lx, lz)) return null;
  if (lz < PLAN.step) return SANCTUARY_Y;
  if (lz < PLAN.step + 0.5) return FLOOR_Y + ((SANCTUARY_Y - FLOOR_Y) * (PLAN.step + 0.5 - lz)) / 0.5;
  return FLOOR_Y;
}

/** How high the ceiling is over a local point inside (for keeping the camera under it). */
export function ceilingLocal(lx: number, lz: number) {
  if (lz > PLAN.narthex) return PLAN.doorHeight;
  if (lz > PLAN.tz1) return Math.abs(lx) < PLAN.nave ? NAVE_CEILING : APEX;
  if (lz > PLAN.tz0) return NAVE_CEILING;
  return SANCTUARY_CEILING;
}

/**
 * The church's walls for walking into and for the camera: its outline with a gap at the door, the
 * passage under the choir loft, and inside, the columns, pew blocks, loft posts and the altar.
 */
export function addChurchObstacles(obstacles: Obstacles) {
  const P = PLAN;
  const w = (lx: number, lz: number) => toWorld(CHURCH, lx, lz);
  const line = (pts: [number, number][], h = 40) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = w(...pts[i]);
      const [bx, bz] = w(...pts[i + 1]);
      obstacles.addSegment(ax, az, bx, bz, h);
    }
  };
  const d = P.doorHalf;
  // the outline, from one side of the doorway right round to the other
  line([
    [-d, P.porch],
    [-4.2, P.porch],
    [-4.2, P.facade],
    [-P.aisle, P.facade],
    [-P.aisle, P.tz1],
    [P.tx0, P.tz1],
    [P.tx0, P.tz0],
    [P.ax0, P.tz0],
    [P.ax0, P.az0],
    [P.ax1, P.az0],
    [P.ax1, P.tz0],
    [P.tx1, P.tz0],
    [P.tx1, P.tz1],
    [P.aisle, P.tz1],
    [P.aisle, P.facade],
    [4.2, P.facade],
    [4.2, P.porch],
    [d, P.porch],
  ]);
  // the passage walls, and the front wall of the nave either side of it
  line([
    [-d, P.porch],
    [-d, P.narthex],
    [-P.aisle, P.narthex],
  ]);
  line([
    [d, P.porch],
    [d, P.narthex],
    [P.aisle, P.narthex],
  ]);
  for (const side of [-1, 1]) {
    for (const z of COLUMNS) obstacles.addCircle(...w(side * P.nave, z), 0.5, 9);
    obstacles.addCircle(...w(side * 3, -9.6), 0.25, 4); // choir-loft posts
    // each pew on its own, so you can walk along the rows
    for (const z of PEWS)
      obstacles.addPolygon(
        [
          w(side * PEW_IN, z - 0.25),
          w(side * PEW_OUT, z - 0.25),
          w(side * PEW_OUT, z + 0.3),
          w(side * PEW_IN, z + 0.3),
        ].flat(),
        1.1,
      );
  }
  // the four piers of the crossing
  for (const x of [-P.nave, P.nave]) for (const z of [P.tz1, P.tz0]) obstacles.addCircle(...w(x, z), 0.75, 13);
  // the altar table and the altarpiece
  obstacles.addPolygon([w(-1.9, -73.3), w(1.9, -73.3), w(1.9, -74.7), w(-1.9, -74.7)].flat(), 1.8);
  obstacles.addPolygon([w(-5.6, -76.8), w(5.6, -76.8), w(5.6, -78.5), w(-5.6, -78.5)].flat(), 12);
}

export function buildChurchInterior() {
  const k = new Kit();
  const P = PLAN;
  const T = 0.3; // wall thickness
  /** a wall along x at z, from x0 to x1, y0 to y1 */
  const wx = (x0: number, x1: number, z: number, y0: number, y1: number, color = WALL) =>
    k.box(Math.abs(x1 - x0), y1 - y0, T, color, { x: (x0 + x1) / 2, y: y0, z });
  /** a wall along z at x, from z0 to z1, y0 to y1 */
  const wz = (x: number, z0: number, z1: number, y0: number, y1: number, color = WALL) =>
    k.box(T, y1 - y0, Math.abs(z1 - z0), color, { x, y: y0, z: (z0 + z1) / 2 });
  /** a flat slab (floor or ceiling) over a rectangle, its top at y */
  const slab = (x0: number, x1: number, z0: number, z1: number, y: number, h: number, color: string) =>
    k.box(Math.abs(x1 - x0), h, Math.abs(z1 - z0), color, { x: (x0 + x1) / 2, y: y - h, z: (z0 + z1) / 2 });

  // ---- floors, carpet ---------------------------------------------------------------------------
  slab(-P.doorHalf, P.doorHalf, P.porch, P.narthex, FLOOR_Y, FLOOR_Y, FLOOR);
  slab(-P.aisle + 0.1, P.aisle - 0.1, P.narthex, P.tz1, FLOOR_Y, FLOOR_Y, FLOOR);
  slab(P.tx0 + 0.1, P.tx1 - 0.1, P.tz1, P.tz0, FLOOR_Y, FLOOR_Y, FLOOR);
  slab(P.ax0 + 0.1, P.ax1 - 0.1, P.tz0, P.az0 + 0.1, FLOOR_Y, FLOOR_Y, FLOOR);
  slab(P.ax0 + 0.2, P.ax1 - 0.2, P.step, P.az0 + 0.2, SANCTUARY_Y, SANCTUARY_Y - FLOOR_Y, "#e4d9c4"); // sanctuary
  slab(P.ax0 + 0.2, P.ax1 - 0.2, P.step + 0.5, P.step, FLOOR_Y + 0.15, 0.15, "#e4d9c4"); // its step
  slab(-1.1, 1.1, P.narthex, P.step + 0.5, FLOOR_Y + 0.02, 0.02, CARPET); // up the middle
  slab(-1.1, 1.1, P.step, -73, SANCTUARY_Y + 0.02, 0.02, CARPET);
  // darker border tiles down each side of the nave
  for (const side of [-1, 1]) slab(side * 6, side * 7, P.narthex, P.tz1, FLOOR_Y + 0.01, 0.01, "#bfae90");

  // ---- the passage under the choir loft ---------------------------------------------------------
  for (const side of [-1, 1]) wz(side * P.doorHalf, P.porch, P.narthex, 0, P.doorHeight, TRIM);
  // (just under the outside's passage ceiling, so the two don't flicker when both show)
  slab(-P.doorHalf, P.doorHalf, P.porch, P.narthex, P.doorHeight + T - 0.05, T, TRIM);
  // ---- the front wall, with the choir loft and organ over the door -------------------------------
  wx(-(P.aisle - IN), -P.doorHalf, P.narthex, 0, NAVE_CEILING);
  wx(P.doorHalf, P.aisle - IN, P.narthex, 0, NAVE_CEILING);
  wx(-P.doorHalf, P.doorHalf, P.narthex, P.doorHeight, NAVE_CEILING);
  // the inside of the rose window
  k.add(new CircleGeometry(2.3, 32), TRIM, { y: 10.6, z: P.narthex - 0.16, ry: Math.PI });
  k.add(new CircleGeometry(2.0, 32), "#3a5fb0", { y: 10.6, z: P.narthex - 0.17, ry: Math.PI });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.add(new CircleGeometry(0.42, 12), ["#d9a441", "#b93b3b"][i % 2], {
      x: Math.sin(a) * 1.25,
      y: 10.6 + Math.cos(a) * 1.25,
      z: P.narthex - 0.18,
      ry: Math.PI,
    });
  }
  k.add(new CircleGeometry(0.5, 16), "#d9a441", { y: 10.6, z: P.narthex - 0.18, ry: Math.PI });
  // the loft: a deck right across, a gilded balustrade, posts underneath
  const loftZ = P.narthex - 1.6;
  slab(-(P.aisle - IN), P.aisle - IN, P.narthex, P.narthex - 3.2, P.doorHeight + 0.4, 0.4, TRIM);
  k.box(27.9, 0.9, 0.14, TRIM, { y: P.doorHeight + 0.4, z: loftZ - 1.55 });
  k.box(27.9, 0.1, 0.24, GOLD, { y: P.doorHeight + 1.3, z: loftZ - 1.55 });
  k.box(27.9, 0.1, 0.18, GOLD, { y: P.doorHeight + 0.05, z: loftZ - 1.6 });
  for (const side of [-1, 1]) k.cyl(0.18, 0.2, P.doorHeight - FLOOR_Y, TRIM, { x: side * 3, y: FLOOR_Y, z: -9.6 }, 10);
  // organ pipes, tallest in the middle
  for (let i = -9; i <= 9; i++) {
    if (Math.abs(i) < 2) continue;
    const h = 2.6 - Math.abs(Math.abs(i) - 5.5) * 0.22;
    k.cyl(0.11, 0.11, h, "#c9ccd2", { x: i * 0.42, y: P.doorHeight + 0.4, z: P.narthex - 0.5 }, 8);
    k.add(new ConeGeometry(0.11, 0.2, 8).rotateX(Math.PI).translate(0, 0.1, 0), "#9aa0a8", {
      x: i * 0.42,
      y: P.doorHeight + 0.4 - 0.2,
      z: P.narthex - 0.5,
    });
  }
  k.box(8.6, 1.2, 0.6, WOOD, { y: P.doorHeight + 0.4, z: P.narthex - 0.5 }); // organ case

  // ---- nave and aisles ----------------------------------------------------------------------------
  slab(-P.nave + 0.3, P.nave - 0.3, P.narthex, P.tz1, NAVE_CEILING + T, T, TRIM);
  for (const side of [-1, 1]) {
    const sx = side * P.nave;
    // outer aisle walls, aisle ceilings, the upper nave wall over the arcade
    wz(side * (P.aisle - IN), P.narthex, P.tz1, 0, APEX);
    slab(sx, side * (P.aisle - IN), P.narthex, P.tz1, APEX + T, T, TRIM);
    // (set back a little from the outside's nave wall, which shows above the aisle roofs)
    wz(sx - side * 0.3, P.narthex, P.tz1, APEX, NAVE_CEILING, WALL);
    wx(sx, side * P.aisle, P.tz1 - IN, APEX, NAVE_CEILING); // closes the space over the aisle at the transept
    k.box(0.5, 0.3, 44.8, GOLD, { x: sx - side * 0.35, y: APEX - 0.05, z: (P.narthex + P.tz1) / 2 }); // string course
    COLUMNS.forEach((z, i) => {
      // column, base and capital
      k.box(1.2, 0.4, 1.2, TRIM, { x: sx, y: FLOOR_Y, z });
      k.cyl(0.42, 0.48, CAPITAL - FLOOR_Y - 0.9, "#f2ead8", { x: sx, y: FLOOR_Y + 0.4, z }, 14);
      k.add(new CylinderGeometry(0.75, 0.45, 0.5, 14).translate(0, 0.25, 0), GOLD, { x: sx, y: CAPITAL - 0.5, z });
      // a pointed arch to the next column
      const next = COLUMNS[i + 1];
      if (next !== undefined) {
        const s = (z - next) / 2;
        const rise = APEX - CAPITAL;
        const len = Math.hypot(s, rise);
        const lean = Math.atan2(rise, s);
        // two leaning ribs meeting at the point (centred boxes, so they turn about their middles)
        k.add(new BoxGeometry(0.55, 0.5, len), TRIM, { x: sx, y: CAPITAL + rise / 2, z: z - s / 2, rx: lean });
        k.add(new BoxGeometry(0.55, 0.5, len), TRIM, { x: sx, y: CAPITAL + rise / 2, z: next + s / 2, rx: -lean });
      }
      // a saint on her bracket, facing across the nave
      const bx = sx - side * 0.6;
      k.box(0.8, 0.22, 0.8, GOLD, { x: bx, y: 3.1, z });
      k.merge(saint(i * 2 + (side > 0 ? 1 : 0)), { x: bx, y: 3.32, z, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
      // a stained-glass lancet in the aisle wall, between this column and the next
      if (next !== undefined) {
        const wzMid = (z + next) / 2;
        stainedLancet(
          k,
          side * (P.aisle - IN - 0.2),
          2.4,
          wzMid,
          side > 0 ? -Math.PI / 2 : Math.PI / 2,
          i + (side > 0 ? 3 : 0),
        );
        // and a round clerestory window over the arcade
        k.add(new CircleGeometry(0.75, 20), TRIM, {
          x: sx - side * 0.46,
          y: 11,
          z: wzMid,
          ry: side > 0 ? -Math.PI / 2 : Math.PI / 2,
        });
        k.add(new CircleGeometry(0.6, 20), ["#d9a441", "#3a5fb0", "#b93b3b"][i % 3], {
          x: sx - side * 0.47,
          y: 11,
          z: wzMid,
          ry: side > 0 ? -Math.PI / 2 : Math.PI / 2,
        });
      }
    });
  }
  // transverse ribs across the nave ceiling, over each pair of columns
  for (const z of COLUMNS) k.box(12.1, 0.35, 0.4, GOLD, { y: NAVE_CEILING - 0.35, z });
  // pews, either side of the carpet
  const pewLen = PEW_OUT - PEW_IN;
  for (const side of [-1, 1])
    for (const z of PEWS) {
      const x = (side * (PEW_IN + PEW_OUT)) / 2;
      k.box(pewLen, 0.08, 0.45, WOOD, { x, y: FLOOR_Y + 0.45, z });
      k.box(pewLen, 0.5, 0.06, WOOD, { x, y: FLOOR_Y + 0.6, z: z + 0.24 });
      for (const e of [-1, 1]) k.box(0.08, 0.95, 0.6, "#5a3820", { x: x + (e * pewLen) / 2, y: FLOOR_Y, z: z + 0.05 });
    }
  // chandeliers down the nave
  for (const z of [-15, -25, -35, -45]) chandelier(k, 0, z, NAVE_CEILING);

  // ---- transept and crossing -----------------------------------------------------------------------
  slab(P.tx0 + IN, P.tx1 - IN, P.tz1 - IN, P.tz0 + IN, NAVE_CEILING + T, T, TRIM);
  wx(P.tx0, -P.aisle + IN, P.tz1 - IN, 0, NAVE_CEILING);
  wx(P.aisle - IN, P.tx1, P.tz1 - IN, 0, NAVE_CEILING);
  wx(P.tx0, P.ax0 + IN, P.tz0 + IN, 0, NAVE_CEILING);
  wx(P.ax1 - IN, P.tx1, P.tz0 + IN, 0, NAVE_CEILING);
  wx(P.ax0 + IN, P.ax1 - IN, P.tz0, SANCTUARY_CEILING, NAVE_CEILING); // over the sanctuary arch
  const tMid = (P.tz0 + P.tz1) / 2;
  for (const [x, dir] of [
    [P.tx0, 1],
    [P.tx1, -1],
  ]) {
    wz(x + dir * IN, P.tz1, P.tz0, 0, NAVE_CEILING);
    // the inside of the transept's rose window and three lancets
    const ry = (dir * Math.PI) / 2;
    k.add(new CircleGeometry(2.1, 24), TRIM, { x: x + dir * (IN + 0.16), y: 9.5, z: tMid, ry });
    k.add(new CircleGeometry(1.8, 24), "#b93b3b", { x: x + dir * (IN + 0.17), y: 9.5, z: tMid, ry });
    k.add(new CircleGeometry(1.1, 24), "#3a5fb0", { x: x + dir * (IN + 0.18), y: 9.5, z: tMid, ry });
    k.add(new CircleGeometry(0.45, 16), "#d9a441", { x: x + dir * (IN + 0.19), y: 9.5, z: tMid, ry });
    for (const [i, dz] of [-2.4, 0, 2.4].entries()) stainedLancet(k, x + dir * (IN + 0.2), 2.2, tMid + dz, ry, i);
  }
  // the crossing: a painted sky under the dome, in a gilded ring, and four piers
  k.add(new CircleGeometry(4.4, 32).rotateX(Math.PI / 2), GOLD, { y: NAVE_CEILING - 0.02, z: tMid });
  k.add(new CircleGeometry(4.0, 32).rotateX(Math.PI / 2), "#7fa4d6", { y: NAVE_CEILING - 0.03, z: tMid });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.ball(0.25, "#f4efe4", { x: Math.sin(a) * 2.6, y: NAVE_CEILING - 0.05, z: tMid + Math.cos(a) * 2.6 }, 8, 6);
  }
  for (const x of [-P.nave, P.nave])
    for (const z of [P.tz1, P.tz0]) k.box(1.3, NAVE_CEILING, 1.3, "#f2ead8", { x, y: 0, z });
  chandelier(k, 0, tMid, NAVE_CEILING, 1.5);

  // ---- sanctuary and the altar ----------------------------------------------------------------------
  slab(P.ax0 + IN, P.ax1 - IN, P.tz0, P.az0 + IN, SANCTUARY_CEILING + T, T, TRIM);
  wz(P.ax0 + IN, P.tz0, P.az0, 0, SANCTUARY_CEILING);
  wz(P.ax1 - IN, P.tz0, P.az0, 0, SANCTUARY_CEILING);
  wx(P.ax0, P.ax1, P.az0 + IN, 0, SANCTUARY_CEILING, "#e9dcc2");
  for (const side of [-1, 1])
    stainedLancet(
      k,
      side > 0 ? P.ax1 - IN - 0.2 : P.ax0 + IN + 0.2,
      2.6,
      -73,
      side > 0 ? -Math.PI / 2 : Math.PI / 2,
      side > 0 ? 4 : 1,
    );
  altarpiece(k, P.az0 + IN + 0.3);
  // the altar table, with candles and a crucifix
  k.box(3.6, 1.0, 1.2, "#f4efe4", { y: SANCTUARY_Y, z: -74 });
  k.box(3.2, 0.6, 0.04, GOLD, { y: SANCTUARY_Y + 0.2, z: -73.38 });
  k.box(3.8, 0.08, 1.4, TRIM, { y: SANCTUARY_Y + 1.0, z: -74 });
  for (const x of [-1.4, -0.8, 0.8, 1.4]) {
    k.cyl(0.05, 0.06, 0.55, "#f6f2ea", { x, y: SANCTUARY_Y + 1.08, z: -74.3 }, 8);
    k.ball(0.05, "#ffcf5a", { x, y: SANCTUARY_Y + 1.7, z: -74.3 }, 8, 6);
  }
  cross(0.8).forEach((g) => k.add(g, GOLD, { y: SANCTUARY_Y + 1.55, z: -74.3 }));

  return k.build()!;
}

// ---------------------------------------------------------------------------------------------
// The pieces

/** A stained-glass lancet on a wall, facing `ry`: a trim frame, coloured glass, a lighter centre. */
function stainedLancet(k: Kit, x: number, y: number, z: number, ry: number, i: number) {
  const glass = ["#3a5fb0", "#b93b3b", "#2f7d6d", "#7a4aa6", "#d9a441"];
  const off = (d: number) => ({ x: x + Math.sin(ry) * d, z: z + Math.cos(ry) * d, ry });
  k.add(lancet(1.6, 4, 0.04), TRIM, { ...off(0), y });
  k.add(lancet(1.3, 3.8, 0.04), glass[i % glass.length], { ...off(0.02), y: y + 0.1 });
  k.add(lancet(0.55, 2.4, 0.04), glass[(i + 2) % glass.length], { ...off(0.04), y: y + 0.6 });
  k.ball(0.22, "#f4d78f", { ...off(0.05), y: y + 4.3 }, 10, 6);
}

/** A chandelier hanging from the ceiling: a rod, a gilded ring of lamps, a lamp in the middle. */
function chandelier(k: Kit, x: number, z: number, ceiling: number, scale = 1) {
  const y = ceiling - 4.5;
  k.cyl(0.03, 0.03, ceiling - y, GOLD, { x, y, z }, 6);
  k.add(new TorusGeometry(0.9 * scale, 0.05, 6, 24).rotateX(Math.PI / 2), GOLD, { x, y, z });
  k.add(new TorusGeometry(0.55 * scale, 0.04, 6, 20).rotateX(Math.PI / 2), GOLD, { x, y: y + 0.45, z });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    k.ball(0.11, "#ffe7a3", { x: x + Math.sin(a) * 0.9 * scale, y: y + 0.13, z: z + Math.cos(a) * 0.9 * scale }, 8, 6);
  }
  k.ball(0.22, "#ffe7a3", { x, y: y - 0.15, z }, 10, 8);
}

/**
 * One of the female saints on the columns: a long robe and mantle, a veil, a gilded halo, hands
 * held together, each in her own colours. About 1.5 m tall, facing +z.
 */
function saint(i: number) {
  const robes: [string, string, string][] = [
    ["#3f5fa8", "#f2ece0", "#f2ece0"],
    ["#7a4b2a", "#e9dfc9", "#2a2a33"],
    ["#a83232", "#3f5fa8", "#f2ece0"],
    ["#2a2a33", "#f2ece0", "#2a2a33"],
    ["#f2ece0", "#3f7a4a", "#f2ece0"],
    ["#6b3f86", "#d9a441", "#f2ece0"],
    ["#3f7a4a", "#a83232", "#e9dfc9"],
    ["#8a6a3a", "#3f5fa8", "#2a2a33"],
  ];
  const [robe, mantle, veil] = robes[i % robes.length];
  const k = new Kit();
  k.cyl(0.2, 0.34, 1.05, robe, {}, 12);
  k.add(new ConeGeometry(0.3, 0.85, 12, 1, true).translate(0, 0.42, 0), mantle, { y: 0.35, z: -0.03 });
  k.cyl(0.13, 0.19, 0.25, robe, { y: 1.02 }, 10);
  k.ball(0.13, SKIN, { y: 1.38 }, 12, 8);
  k.add(new SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), veil, { y: 1.4, z: -0.02 });
  k.add(new TorusGeometry(0.2, 0.025, 6, 20), GOLD, { y: 1.46, z: -0.14 });
  k.ball(0.07, SKIN, { y: 1.02, z: 0.2 }, 8, 6); // hands together
  // a lily, a palm frond or a book, in turn
  if (i % 3 === 0) k.cyl(0.015, 0.015, 0.6, "#3f7a4a", { x: 0.08, y: 0.95, z: 0.22, rz: -0.15 }, 4);
  if (i % 3 === 0) k.ball(0.07, "#ffffff", { x: 0.13, y: 1.55, z: 0.22 }, 8, 6);
  if (i % 3 === 1) k.box(0.05, 0.6, 0.14, "#4f8a3a", { x: -0.1, y: 0.95, z: 0.22, rz: 0.25 });
  if (i % 3 === 2) k.box(0.22, 0.05, 0.16, "#7a1f22", { y: 0.97, z: 0.25, rx: -0.4 });
  return k;
}

/** The white-and-gold Gothic altarpiece against the back wall, with St. Anne in the middle. */
function altarpiece(k: Kit, z: number) {
  const y0 = SANCTUARY_Y;
  k.box(11, 1.3, 1.3, TRIM, { y: y0, z: z + 0.65 }); // the base
  k.box(10.4, 7.2, 0.7, "#f6f0e2", { y: y0 + 1.3, z: z + 0.35 });
  for (const x of [-5, -2.6, 2.6, 5]) k.box(0.4, 7.4, 0.9, GOLD, { x, y: y0 + 1.3, z: z + 0.45 }); // gilded pilasters
  k.box(10.8, 0.3, 1.0, GOLD, { y: y0 + 8.5, z: z + 0.5 }); // cornice
  // three niches: St. Anne in the tall middle one, a saint either side
  k.add(lancet(2.2, 4.6, 0.05), "#2f467f", { y: y0 + 2.2, z: z + 0.72 });
  k.add(lancet(2.5, 4.8, 0.04), GOLD, { y: y0 + 2.1, z: z + 0.71 });
  for (const x of [-3.8, 3.8]) {
    k.add(lancet(1.5, 3.2, 0.05), "#2f467f", { x, y: y0 + 2.6, z: z + 0.72 });
    k.add(lancet(1.75, 3.4, 0.04), GOLD, { x, y: y0 + 2.5, z: z + 0.71 });
  }
  // St. Anne: red gown, green mantle, a white veil, with the child Mary at her side
  const anne = new Kit();
  anne.cyl(0.26, 0.45, 1.4, "#a83232", {}, 14);
  anne.add(new ConeGeometry(0.42, 1.2, 14, 1, true).translate(0, 0.6, 0), "#3f7a4a", { y: 0.4, z: -0.04 });
  anne.cyl(0.17, 0.25, 0.3, "#a83232", { y: 1.36 }, 10);
  anne.ball(0.17, SKIN, { y: 1.83 }, 12, 8);
  anne.add(new SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), "#f2ece0", { y: 1.86, z: -0.03 });
  anne.add(new TorusGeometry(0.3, 0.035, 6, 24), GOLD, { y: 1.95, z: -0.2 });
  anne.cyl(0.12, 0.2, 0.75, "#f2ece0", { x: 0.5, z: 0.12 }, 10); // Mary
  anne.ball(0.11, SKIN, { x: 0.5, y: 0.87, z: 0.12 }, 10, 8);
  anne.add(new SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), "#3f5fa8", { x: 0.5, y: 0.89, z: 0.1 });
  k.merge(anne, { y: y0 + 2.3, z: z + 0.95, sx: 1.25, sy: 1.25, sz: 1.25 });
  for (const x of [-3.8, 3.8])
    k.merge(saint(x < 0 ? 1 : 5), { x, y: y0 + 2.65, z: z + 0.95, sx: 1.1, sy: 1.1, sz: 1.1 });
  // pinnacles across the top, the middle one tallest, with a cross
  // (the sanctuary ceiling is at 12 m, so they stop short of it)
  for (const [x, h] of [
    [-5, 1.1],
    [-2.6, 1.5],
    [0, 1.9],
    [2.6, 1.5],
    [5, 1.1],
  ]) {
    k.add(new ConeGeometry(0.4, h, 4).translate(0, h / 2, 0), x === 0 ? GOLD : "#f6f0e2", {
      x,
      y: y0 + 8.8,
      z: z + 0.5,
      ry: Math.PI / 4,
    });
    k.ball(0.12, GOLD, { x, y: y0 + 8.8 + h, z: z + 0.5 }, 8, 6);
  }
}
