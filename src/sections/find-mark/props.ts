// Everything standing about in the plaza and the mansion grounds, placed from the OpenStreetMap data:
// the fountain, the gazebo of the six goddesses, the Maria Clara and Pura Villanueva Kalaw monuments,
// the flagpole in its ring of benches, playgrounds, lamp posts, bollards, a sorbetes cart, the mansion's
// fence and gate, little café kiosks, and the painted signs on the shops.

import {
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  SphereGeometry,
  Quaternion,
  TorusGeometry,
  Vector3,
  type Curve,
} from "three";
import { Obstacles, inside } from "./collide";
import { nearestRoad } from "./ground";
import { orientedBox } from "./buildings";
import { Kit } from "./kit";
import { food } from "./people";
import { areas, benches, buildings, gates, paths, points, signs } from "./molo-map";
import { MANSION, toWorld } from "./world";

const MARBLE = "#f3efe7";
const STONE = "#e9e0cf";
const IRON = "#2a2b2e";
const BRONZE = "#7c5a34";

type Pt = [number, number];
const centre = (pts: number[]): Pt => {
  let x = 0;
  let z = 0;
  const n = pts.length / 2;
  for (let i = 0; i < pts.length; i += 2) {
    x += pts[i];
    z += pts[i + 1];
  }
  return [x / n, z / n];
};
const ringOf = (pts: number[]) => {
  const r: Pt[] = [];
  for (let i = 0; i < pts.length; i += 2) r.push([pts[i], pts[i + 1]]);
  return r;
};
const area = (kind: string) => areas.filter((a) => a.kind === kind);
const plazaRing = area("plaza")[0]?.points ?? [];
const churchyard = area("churchyard")[0]?.points ?? [];

/** Turn (rotation.y) that makes something facing +z look toward (tx, tz). */
const face = (x: number, z: number, tx: number, tz: number) => Math.atan2(tx - x, tz - z);

export type WaterDisc = { x: number; y: number; z: number; r: number };
export type Fall = { x: number; z: number; y: number; h: number; rTop: number; rBottom: number };
export type SignPlacement = {
  name: string;
  x: number;
  y: number;
  z: number;
  ry: number;
  w: number;
  h: number;
  index: number;
};
export type Platform = { x: number; z: number; r: number; h: number };

export function buildProps(obstacles: Obstacles) {
  const k = new Kit();
  const waters: WaterDisc[] = [];
  const falls: Fall[] = [];
  const jets: Curve<Vector3>[] = [];
  const platforms: Platform[] = [];

  // ---- the plaza fountain --------------------------------------------------------------------
  const fountainArea = area("fountain")[0];
  const [fx, fz] = fountainArea ? centre(fountainArea.points) : [-3.6, -15.7];
  {
    const R = 4.1;
    k.cyl(R, R + 0.1, 0.6, STONE, { x: fx, z: fz }, 48);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      k.ball(0.34, "#f4eee2", { x: fx + Math.sin(a) * R, y: 0.6, z: fz + Math.cos(a) * R, sy: 0.55 }, 10, 6);
    }
    waters.push({ x: fx, y: 0.46, z: fz, r: R - 0.15 });
    k.cyl(0.75, 0.95, 1.6, STONE, { x: fx, z: fz }, 16);
    k.cyl(2.0, 0.6, 0.45, "#f1e9db", { x: fx, y: 1.6, z: fz }, 32);
    waters.push({ x: fx, y: 2.02, z: fz, r: 1.88 });
    k.cyl(0.38, 0.45, 1.0, STONE, { x: fx, y: 2.05, z: fz }, 12);
    k.cyl(1.2, 0.35, 0.35, "#f1e9db", { x: fx, y: 3.05, z: fz }, 24);
    waters.push({ x: fx, y: 3.38, z: fz, r: 1.1 });
    k.cyl(0.22, 0.28, 0.7, STONE, { x: fx, y: 3.4, z: fz }, 10);
    k.cyl(0.6, 0.18, 0.25, "#f1e9db", { x: fx, y: 4.1, z: fz }, 16);
    k.add(new ConeGeometry(0.16, 0.5, 8).translate(0, 0.25, 0), "#f1e9db", { x: fx, y: 4.35, z: fz });
    falls.push({ x: fx, z: fz, y: 0.45, h: 1.6, rTop: 2.0, rBottom: 2.2 });
    falls.push({ x: fx, z: fz, y: 2.02, h: 1.38, rTop: 1.2, rBottom: 1.32 });
    falls.push({ x: fx, z: fz, y: 3.38, h: 0.97, rTop: 0.6, rBottom: 0.7 });
    // jets arcing in from the rim
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const from = new Vector3(fx + Math.sin(a) * 3.7, 0.55, fz + Math.cos(a) * 3.7);
      const to = new Vector3(fx + Math.sin(a) * 2.3, 0.5, fz + Math.cos(a) * 2.3);
      jets.push(arc(from, to, 1.6));
      k.cyl(0.08, 0.1, 0.14, "#9a8f7c", { x: from.x, y: 0.5, z: from.z }, 6);
    }
    obstacles.addCircle(fx, fz, R + 0.2, 0.7);
  }

  // ---- the gazebo of the six goddesses -------------------------------------------------------
  const gz = area("gazebo")[0];
  const [gx, gzz] = gz ? centre(gz.points) : [-14.8, -30.3];
  {
    k.cyl(3.3, 3.4, 0.22, STONE, { x: gx, z: gzz }, 32);
    k.cyl(3.0, 3.0, 0.45, "#f2ece0", { x: gx, z: gzz }, 32);
    for (let i = -3; i < 3; i++)
      for (let j = -3; j < 3; j++) {
        const x = (i + 0.5) * 0.85;
        const z = (j + 0.5) * 0.85;
        if (Math.hypot(x, z) > 2.7) continue;
        k.box(0.85, 0.02, 0.85, (i + j) % 2 ? "#a23b31" : "#f6f1e7", { x: gx + x, y: 0.45, z: gzz + z });
      }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = gx + Math.sin(a) * 2.45;
      const z = gzz + Math.cos(a) * 2.45;
      k.box(0.5, 0.25, 0.5, MARBLE, { x, y: 0.45, z, ry: a });
      k.cyl(0.17, 0.2, 2.9, MARBLE, { x, y: 0.7, z }, 12);
      k.box(0.46, 0.22, 0.46, MARBLE, { x, y: 3.6, z, ry: a });
      obstacles.addCircle(x, z, 0.25, 4);
    }
    k.cyl(2.75, 2.75, 0.45, MARBLE, { x: gx, y: 3.82, z: gzz }, 32);
    k.add(new TorusGeometry(2.78, 0.09, 6, 32).rotateX(Math.PI / 2), "#fbf9f4", { x: gx, y: 4.2, z: gzz });
    k.add(new SphereGeometry(2.6, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.72, 1), "#faf7f1", {
      x: gx,
      y: 4.27,
      z: gzz,
    });
    k.ball(0.22, MARBLE, { x: gx, y: 6.25, z: gzz });
    k.add(new ConeGeometry(0.1, 0.5, 8).translate(0, 0.25, 0), "#c9a046", { x: gx, y: 6.4, z: gzz });
    // six goddesses, each with something to hold
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = gx + Math.sin(a) * 1.55;
      const z = gzz + Math.cos(a) * 1.55;
      k.merge(goddess(i), { x, y: 0.45, z, ry: a });
      obstacles.addCircle(x, z, 0.35, 2.5);
    }
    platforms.push({ x: gx, z: gzz, r: 3.05, h: 0.45 });
  }

  // ---- Maria Clara, facing the fountain ------------------------------------------------------
  const mc = area("monument")[0];
  const [mx, mz] = mc ? centre(mc.points) : [3.3, 1.7];
  {
    k.cyl(2.4, 2.5, 0.35, STONE, { x: mx, z: mz }, 32);
    k.cyl(1.8, 1.85, 0.35, "#ddd3c1", { x: mx, y: 0.35, z: mz }, 32);
    const ry = face(mx, mz, fx, fz);
    k.box(1.3, 2.4, 1.3, MARBLE, { x: mx, y: 0.7, z: mz, ry });
    k.box(1.5, 0.25, 1.5, MARBLE, { x: mx, y: 3.1, z: mz, ry });
    k.box(0.8, 0.5, 0.05, "#3b3a37", { x: mx + Math.sin(ry) * 0.66, y: 1.6, z: mz + Math.cos(ry) * 0.66, ry }); // plaque
    k.merge(lady("#f6f3ec", true), { x: mx, y: 3.35, z: mz, ry, sx: 1.25, sy: 1.25, sz: 1.25 });
    obstacles.addCircle(mx, mz, 2.45, 3);
  }

  // ---- Pura Villanueva Kalaw, in bronze ------------------------------------------------------
  const kalaw = points.find((p) => p.kind === "statue");
  if (kalaw) {
    const [kx, kz] = kalaw.at as Pt;
    const ry = face(kx, kz, 10, 10);
    k.cyl(1.25, 1.3, 0.3, STONE, { x: kx, z: kz }, 24);
    k.box(1.1, 1.6, 1.1, "#8b8580", { x: kx, y: 0.3, z: kz, ry });
    k.box(0.6, 0.35, 0.05, "#c9a046", { x: kx + Math.sin(ry) * 0.56, y: 1.0, z: kz + Math.cos(ry) * 0.56, ry });
    k.merge(lady(BRONZE, false), { x: kx, y: 1.9, z: kz, ry, sx: 1.1, sy: 1.1, sz: 1.1 });
    obstacles.addCircle(kx, kz, 1.3, 3);
  }

  // ---- a friendly bee outside the fast-food place ---------------------------------------
  const mascot = points.find((p) => p.kind === "mascot");
  if (mascot) {
    const [jx, jz] = mascot.at as Pt;
    const road = nearestRoad(jx, jz);
    const ry = face(jx, jz, road.px, road.pz);
    k.merge(beeMascot(), { x: jx, z: jz, ry, sx: 1.15, sy: 1.15, sz: 1.15 });
    obstacles.addCircle(jx, jz, 0.8, 3);
  }

  // ---- flagpole in its ring of benches -------------------------------------------------------
  const pole = points.find((p) => p.kind === "flagpole");
  let flag: { x: number; z: number; top: number } | null = null;
  if (pole) {
    const [px, pz] = pole.at as Pt;
    k.cyl(0.7, 0.8, 0.4, STONE, { x: px, z: pz }, 8);
    k.cyl(0.07, 0.1, 12, "#f2f2f0", { x: px, y: 0.4, z: pz }, 10);
    k.ball(0.16, "#d8b24a", { x: px, y: 12.5, z: pz });
    flag = { x: px, z: pz, top: 12.2 };
    obstacles.addCircle(px, pz, 0.8, 1);
    for (let i = 0; i < benches.length; i += 2) {
      const bx = benches[i];
      const bz = benches[i + 1];
      if (Math.hypot(bx - px, bz - pz) > 14) continue;
      bench(k, bx, bz, face(bx, bz, px, pz));
      obstacles.addCircle(bx, bz, 0.55, 1);
    }
  }

  // ---- playgrounds and the fitness corner ----------------------------------------------------
  area("playground").forEach((a, i) => {
    const box = orientedBox(ringOf(a.points));
    const ry = Math.atan2(box.ux, box.uz);
    const at = (u: number, v: number): Pt => [box.cx + box.ux * u - box.uz * v, box.cz + box.uz * u + box.ux * v];
    const [sx, sz] = at(-box.a * 0.45, 0);
    swings(k, sx, sz, ry + Math.PI / 2, i);
    obstacles.addCircle(sx, sz, 0.5, 2);
    const [lx, lz] = at(box.a * 0.25, -box.b * 0.3);
    slide(k, lx, lz, ry, i);
    obstacles.addCircle(lx, lz, 1, 2);
    const [ex, ez] = at(box.a * 0.3, box.b * 0.4);
    seesaw(k, ex, ez, ry);
    obstacles.addCircle(ex, ez, 0.5, 1);
    const [dx, dz] = at(-box.a * 0.05, box.b * 0.45);
    k.add(new SphereGeometry(1.2, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), i ? "#2c56b8" : "#e6ab2e", { x: dx, z: dz }); // climbing dome
    obstacles.addCircle(dx, dz, 1.25, 1.2);
  });
  for (const a of area("fitness")) {
    const [cx, cz] = centre(a.points);
    const box = orientedBox(ringOf(a.points));
    const ry = Math.atan2(box.ux, box.uz);
    for (const u of [-1.6, 1.6])
      for (const v of [-0.45, 0.45])
        k.cyl(
          0.05,
          0.05,
          2.2,
          "#1b8e8e",
          { x: cx + Math.sin(ry) * u + Math.cos(ry) * v, z: cz + Math.cos(ry) * u - Math.sin(ry) * v },
          6,
        );
    for (let r = -1.5; r <= 1.5; r += 0.375)
      k.cyl(
        0.03,
        0.03,
        0.9,
        "#d9d9d9",
        { x: cx + Math.sin(ry) * r, y: 2.2, z: cz + Math.cos(ry) * r, rz: Math.PI / 2, ry },
        5,
      );
    for (const v of [-0.45, 0.45])
      k.box(0.08, 0.08, 3.3, "#1b8e8e", { x: cx + Math.cos(ry) * v, y: 2.16, z: cz - Math.sin(ry) * v, ry });
    obstacles.addCircle(cx, cz, 0.3, 2);
  }

  // ---- welcome board -------------------------------------------------------------------------
  const welcome = points.find((p) => p.kind === "welcome-sign");
  let welcomeSign: SignPlacement | null = null;
  if (welcome) {
    const [wx, wz] = welcome.at as Pt;
    const road = nearestRoad(wx, wz);
    const ry = face(wx, wz, road.px, road.pz);
    for (const side of [-1, 1])
      k.box(0.18, 2.3, 0.18, "#5b3a26", { x: wx + Math.cos(ry) * side * 1.9, z: wz - Math.sin(ry) * side * 1.9 });
    k.box(4.1, 1.55, 0.12, "#5b3a26", { x: wx, y: 0.85, z: wz, ry });
    welcomeSign = {
      name: "welcome",
      x: wx + Math.sin(ry) * 0.07,
      y: 1.62,
      z: wz + Math.cos(ry) * 0.07,
      ry,
      w: 3.9,
      h: 1.37,
      index: 0,
    };
    obstacles.addCircle(wx, wz, 0.5, 2);
  }

  // ---- lamp posts and benches along the walks; bins here and there ---------------------------
  for (const p of paths) {
    const mid = Math.floor(p.length / 4) * 2;
    const [mx2, mz2] = [p[mid], p[mid + 1]];
    if (!(inside(plazaRing, mx2, mz2) || inside(churchyard, mx2, mz2))) continue;
    let carry = 6;
    let n = 0;
    for (let i = 0; i < p.length - 2; i += 2) {
      const ax = p[i];
      const az = p[i + 1];
      const dx = p[i + 2] - ax;
      const dz = p[i + 3] - az;
      const len = Math.hypot(dx, dz);
      if (len < 0.01) continue;
      const ux = dx / len;
      const uz = dz / len;
      for (let t = carry; t < len; t += 13) {
        const side = n % 2 ? 1 : -1;
        const x = ax + ux * t;
        const z = az + uz * t;
        const lx = x - uz * side * 1.75;
        const lz = z + ux * side * 1.75;
        lamp(k, lx, lz);
        obstacles.addCircle(lx, lz, 0.18, 4);
        if (n % 2 === 0) {
          const bx = x + uz * side * 1.9;
          const bz = z - ux * side * 1.9;
          bench(k, bx, bz, face(bx, bz, x, z));
          obstacles.addCircle(bx, bz, 0.5, 1);
          if (n % 4 === 0) {
            k.cyl(0.26, 0.24, 0.85, "#2f6b2a", { x: bx + ux * 1.3, z: bz + uz * 1.3 }, 10);
            obstacles.addCircle(bx + ux * 1.3, bz + uz * 1.3, 0.28, 1);
          }
        }
        n++;
        carry = t + 13 - len;
      }
      if (carry >= len) carry -= len;
    }
  }

  // bollards along the plaza's edge facing the church (OpenStreetMap: barrier = bollard)
  {
    const [ax, az, bx, bz] = [31.9, -19.2, 19.4, -43.1];
    const len = Math.hypot(bx - ax, bz - az);
    for (let t = 0; t <= len; t += 1.7) {
      const x = ax + ((bx - ax) * t) / len;
      const z = az + ((bz - az) * t) / len;
      k.cyl(0.11, 0.13, 0.8, "#f4f1ea", { x, z }, 8);
      k.cyl(0.115, 0.115, 0.1, "#b92a4f", { x, y: 0.6, z }, 8);
      obstacles.addCircle(x, z, 0.14, 0.8);
    }
  }

  // a sorbetes cart by the fountain, and a balloon seller by the playground
  const cart = { x: fx + 7.5, z: fz + 5 };
  sorbetes(k, cart.x, cart.z, face(cart.x, cart.z, fx, fz));
  obstacles.addCircle(cart.x, cart.z, 0.85, 2);
  const playground = area("playground")[0];
  const balloons = playground ? centre(playground.points) : ([0, 25] as Pt);
  const balloonSpot: Pt = [balloons[0] - 6, balloons[1] - 3];

  // ---- the mansion's fence and gate (along the edge of its grounds, from OpenStreetMap) ------------
  // the mansion's own gate: of the mapped gates, the one at the end of its drive
  const [driveX, driveZ] = toWorld(MANSION, 1.7, 32.6);
  let gate: Pt = [driveX, driveZ];
  let gateDist = 6;
  for (let i = 0; i < gates.length; i += 2) {
    const d = Math.hypot(gates[i] - driveX, gates[i + 1] - driveZ);
    if (d < gateDist) {
      gateDist = d;
      gate = [gates[i], gates[i + 1]];
    }
  }
  const fenceLine: Pt[] = [
    [-98.1, 11.9],
    [-58.4, -13.5],
    [-51.9, -3.5],
    [-39.4, 15.3],
    [-35.7, 20.8],
    [-23.7, 39.2],
    [-95.9, 88.9],
  ];
  for (let i = 0; i < fenceLine.length - 1; i++) fence(k, obstacles, fenceLine[i], fenceLine[i + 1], gate, 4);
  {
    // gate pillars with lamps, either side of the opening, in line with the fence
    const at = fenceLine.reduce(
      (best, p, i) =>
        Math.hypot(p[0] - gate[0], p[1] - gate[1]) <
        Math.hypot(fenceLine[best][0] - gate[0], fenceLine[best][1] - gate[1])
          ? i
          : best,
      0,
    );
    const [ax, az] = fenceLine[Math.max(at - 1, 0)];
    const [bx, bz] = fenceLine[Math.min(at + 1, fenceLine.length - 1)];
    const len = Math.hypot(bx - ax, bz - az);
    for (const side of [-1, 1]) {
      const x = gate[0] + ((bx - ax) / len) * side * 4.1;
      const z = gate[1] + ((bz - az) / len) * side * 4.1;
      k.box(0.8, 2.6, 0.8, "#fbf7ee", { x, z });
      k.box(1, 0.2, 1, "#e9dcc4", { x, y: 2.6, z });
      k.cyl(0.08, 0.1, 0.4, IRON, { x, y: 2.8, z }, 6);
      k.ball(0.28, "#fff6dc", { x, y: 3.35, z });
      obstacles.addCircle(x, z, 0.5, 3);
    }
  }

  // lamps and clipped hedges along the drive in from the gate (it runs a little off the house's axis)
  const drive = 1.7;
  for (const lz of [24, 29.5])
    for (const side of [-1, 1]) {
      const [x, z] = toWorld(MANSION, drive + side * 3, lz);
      lamp(k, x, z);
      obstacles.addCircle(x, z, 0.18, 4);
    }
  for (const side of [-1, 1])
    for (let lz = 23.5; lz <= 30.5; lz += 1.4) {
      const [x, z] = toWorld(MANSION, drive + side * 4.3, lz);
      k.box(1.3, 0.8, 1.0, Math.round(lz / 1.4) % 2 ? "#3f7a34" : "#467f37", { x, z, ry: MANSION.angle });
      obstacles.addCircle(x, z, 0.6, 1);
    }

  // ---- shop signs, and kiosks where a café has no building of its own --------------------------
  const signPlacements: SignPlacement[] = [];
  signs.forEach((s, index) => {
    const [px, pz] = s.at as Pt;
    const placed = signOnBuilding(px, pz, s.name, index + 1, s.street);
    if (placed) {
      signPlacements.push(placed);
      return;
    }
    // a kiosk with a striped awning, facing the nearest drive or street
    const road = nearestRoad(px, pz);
    const ry = face(px, pz, road.px, road.pz);
    kiosk(k, px, pz, ry, index);
    obstacles.addPolygon(rect(px, pz, ry, 1.6, 1.3), 3);
    signPlacements.push({
      name: s.name,
      x: px + Math.sin(ry) * 1.13,
      y: 2.15,
      z: pz + Math.cos(ry) * 1.13,
      ry,
      w: 2.6,
      h: 0.42,
      index: index + 1,
    });
  });

  // ---- Jollibee's outdoor tables, out front under its sign -------------------------------------
  // Red tables with yellow stools, burgers, fries and drinks on red trays, either side of the door.
  // The diners themselves are people (see Life), seated at the spots listed in `diners`.
  const diners: { x: number; z: number; ry: number }[] = [];
  const front = signPlacements.find((s) => s.name === "Jollibee");
  if (front) {
    const nx = Math.sin(front.ry); // out from the wall
    const nz = Math.cos(front.ry);
    const ux = nz; // along it
    const uz = -nx;
    const [mx0, mz0] = (mascot?.at as Pt | undefined) ?? [Infinity, Infinity];
    const ry = Math.atan2(ux, uz);
    for (const [along, out] of [
      [-3.1, 2.2],
      [3.1, 2.2],
      [-1.9, 4.4],
      [1.9, 4.4],
    ]) {
      const tx = front.x + ux * along + nx * out;
      const tz = front.z + uz * along + nz * out;
      const road = nearestRoad(tx, tz);
      if (Math.hypot(tx - mx0, tz - mz0) < 2.3 || road.d < road.width / 2 + 1.3) continue;
      // the table: a round red top on a yellow pedestal
      k.cyl(0.28, 0.32, 0.03, "#2a2b2e", { x: tx, z: tz }, 16);
      k.cyl(0.05, 0.05, 0.7, "#ffd400", { x: tx, z: tz }, 10);
      k.cyl(0.5, 0.5, 0.04, "#d3121f", { x: tx, y: 0.7, z: tz }, 28);
      obstacles.addCircle(tx, tz, 0.55, 0.8);
      for (const side of [-1, 1]) {
        // a yellow stool either side, and a tray of food in front of it
        const sx = tx + ux * side * 0.82;
        const sz = tz + uz * side * 0.82;
        k.cyl(0.03, 0.03, 0.42, "#2a2b2e", { x: sx, z: sz }, 6);
        k.cyl(0.2, 0.2, 0.05, "#ffd400", { x: sx, y: 0.4, z: sz }, 16);
        diners.push({ x: sx, z: sz, ry: ry + (side > 0 ? Math.PI : 0) }); // facing the table
        const px = tx + ux * side * 0.25;
        const pz = tz + uz * side * 0.25;
        k.box(0.3, 0.012, 0.38, "#b80f1a", { x: px, y: 0.74, z: pz, ry });
        // a: along the wall (toward or away from the diner), b: out from it
        const at = (a: number, b: number) => ({ x: px + ux * a + nx * b, z: pz + uz * a + nz * b, y: 0.752 });
        k.merge(food("burger"), at(0, -0.08));
        k.merge(food("fries"), at(side * -0.04, 0.1));
        k.merge(food("drink"), at(side * 0.06, -0.24 * side));
      }
    }
  }

  return {
    geometry: k.build()!,
    waters,
    falls,
    jets,
    flag,
    platforms,
    signPlacements,
    welcomeSign,
    balloonSpot,
    fountain: { x: fx, z: fz },
    diners,
  };
}

// ---------------------------------------------------------------------------------------------
// The pieces

/** A parabola from one point to another, peaking `height` above them, as a curve for a tube of water. */
function arc(from: Vector3, to: Vector3, height: number) {
  const pts: Vector3[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new Vector3().lerpVectors(from, to, t).setY(from.y + (to.y - from.y) * t + 4 * height * t * (1 - t)));
  }
  return new CatmullRomCurve3(pts);
}

function goddess(i: number) {
  const k = new Kit();
  k.box(0.6, 0.6, 0.6, MARBLE);
  k.box(0.68, 0.1, 0.68, MARBLE, { y: 0.6 });
  k.add(new ConeGeometry(0.32, 1.25, 12).translate(0, 0.62, 0), MARBLE, { y: 0.7 });
  k.cyl(0.13, 0.17, 0.42, MARBLE, { y: 1.75 }, 10);
  k.ball(0.14, MARBLE, { y: 2.33 });
  k.ball(0.09, MARBLE, { y: 2.38, z: -0.12 });
  const attribute = [
    () => {
      k.cyl(0.025, 0.025, 2.0, MARBLE, { x: 0.3, y: 1.0 }, 5); // Athena's spear
      k.cyl(0.32, 0.32, 0.06, MARBLE, { x: -0.3, y: 1.55, z: 0.1, rx: Math.PI / 2 }, 16); // and shield
    },
    () =>
      k.add(new TorusGeometry(0.42, 0.025, 4, 16, Math.PI), MARBLE, {
        x: -0.32,
        y: 1.75,
        ry: Math.PI / 2,
        rz: Math.PI / 2,
      }), // a bow
    () => k.cyl(0.1, 0.05, 0.6, "#efe5c8", { x: 0.28, y: 1.6, rz: -0.3 }, 8), // a sheaf of wheat
    () => k.add(new TorusGeometry(0.13, 0.03, 4, 12).rotateX(Math.PI / 2), MARBLE, { y: 2.45 }), // a crown
    () => k.ball(0.08, MARBLE, { x: 0.3, y: 2.2, z: 0.1 }), // an apple held up
    () => k.cyl(0.16, 0.08, 0.12, MARBLE, { x: 0.26, y: 1.85, z: 0.12 }, 10), // a bowl of fire
  ];
  // one arm raised, one at her side
  k.cyl(0.045, 0.05, 0.6, MARBLE, { x: 0.24, y: 1.75, rz: -2.6 }, 6);
  k.cyl(0.045, 0.05, 0.55, MARBLE, { x: -0.2, y: 1.45, rz: 0.15 }, 6);
  attribute[i % attribute.length]();
  return k;
}

/** A rounded limb from one point to another, with a ball at each joint. */
function limb(k: Kit, a: [number, number, number], b: [number, number, number], r: number, color: string) {
  const A = new Vector3(...a);
  const B = new Vector3(...b);
  const dir = B.clone().sub(A);
  const geo = new CylinderGeometry(r, r, dir.length(), 10);
  geo.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize()));
  geo.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  k.add(geo, color);
  k.ball(r, color, { x: A.x, y: A.y, z: A.z }, 10, 6);
  k.ball(r, color, { x: B.x, y: B.y, z: B.z }, 10, 6);
}

/**
 * A friendly cartoon bee greeting people outside the fast-food place (an original character, not a
 * brand mascot): a round yellow body with black stripes and a little stinger, clear wings, big eyes and
 * a wide smile, curly antennae, a woven salakot hat, one arm waving, on a wavy blue base. About 2 m tall,
 * facing +z.
 */
function beeMascot() {
  const YELLOW = "#f6c544";
  const BLACK = "#2a2522";
  const k = new Kit();
  // wavy blue base
  k.add(new CylinderGeometry(0.5, 0.52, 0.09, 20).scale(1.25, 1, 0.9).translate(0, 0.045, 0), "#1d8fbf");
  k.add(new CylinderGeometry(0.25, 0.27, 0.09, 14).translate(0.42, 0.045, 0.22), "#1d8fbf");
  // short legs and round feet
  for (const sx of [-1, 1]) {
    limb(k, [sx * 0.16, 0.16, 0.02], [sx * 0.18, 0.5, 0], 0.06, BLACK);
    k.ball(1, BLACK, { x: sx * 0.17, y: 0.14, z: 0.08, sx: 0.12, sy: 0.08, sz: 0.17 }, 12, 8);
  }
  // the round striped body, and the stinger
  k.ball(1, YELLOW, { y: 0.98, sx: 0.46, sy: 0.52, sz: 0.43 }, 20, 14);
  for (const [y, r] of [
    [0.72, 0.36],
    [0.98, 0.47],
    [1.24, 0.37],
  ])
    k.add(new CylinderGeometry(r, r, 0.1, 24).scale(1, 1, 0.93), BLACK, { y });
  k.add(new ConeGeometry(0.06, 0.2, 8).rotateX(-Math.PI / 2), BLACK, { y: 0.72, z: -0.47 });
  // clear wings
  for (const sx of [-1, 1])
    k.ball(1, "#dcf0f8", { x: sx * 0.34, y: 1.38, z: -0.34, rz: sx * -0.5, sx: 0.32, sy: 0.17, sz: 0.03 }, 14, 8);
  // arms: one waving, one on the hip
  limb(k, [0.4, 1.12, 0], [0.62, 1.42, 0.08], 0.055, BLACK);
  k.ball(0.085, YELLOW, { x: 0.66, y: 1.5, z: 0.1 }, 10, 8);
  limb(k, [-0.4, 1.1, 0], [-0.5, 0.88, 0.12], 0.055, BLACK);
  k.ball(0.085, YELLOW, { x: -0.46, y: 0.84, z: 0.18 }, 10, 8);
  // head: big eyes, rosy cheeks, a wide smile
  k.ball(0.36, YELLOW, { y: 1.78 }, 20, 14);
  for (const sx of [-1, 1]) {
    k.ball(1, "#ffffff", { x: sx * 0.13, y: 1.84, z: 0.27, sx: 0.1, sy: 0.12, sz: 0.06 }, 12, 8);
    k.ball(1, BLACK, { x: sx * 0.12, y: 1.83, z: 0.32, sx: 0.055, sy: 0.07, sz: 0.03 }, 10, 6);
    k.ball(0.018, "#ffffff", { x: sx * 0.12 + 0.02, y: 1.86, z: 0.345 }, 6, 4);
    k.ball(1, "#f0928a", { x: sx * 0.22, y: 1.7, z: 0.25, sx: 0.06, sy: 0.04, sz: 0.03 }, 10, 6);
    // curly antennae with little balls on top
    limb(k, [sx * 0.1, 2.08, 0.05], [sx * 0.2, 2.34, 0.12], 0.016, BLACK);
    k.ball(0.05, BLACK, { x: sx * 0.22, y: 2.37, z: 0.13 }, 8, 6);
  }
  k.add(new TorusGeometry(0.11, 0.02, 6, 16, Math.PI).rotateZ(Math.PI), BLACK, { y: 1.69, z: 0.33 });
  // a woven salakot hat, tipped back so the eyes show
  k.add(new ConeGeometry(0.5, 0.26, 18).translate(0, 0.13, 0), "#c9a066", { y: 2.03, z: -0.04, rx: -0.18 });
  k.ball(0.05, "#8a6a3a", { y: 2.3, z: -0.09 }, 8, 6);
  return k;
}

/** A lady in a Filipiniana gown with butterfly sleeves, in marble or bronze. */
function lady(color: string, fan: boolean) {
  const k = new Kit();
  k.add(new ConeGeometry(0.42, 1.0, 16).translate(0, 0.5, 0), color);
  k.cyl(0.16, 0.22, 0.5, color, { y: 0.95 }, 12);
  for (const side of [-1, 1]) k.ball(0.15, color, { x: side * 0.2, y: 1.38, sx: 1.1, sy: 0.75, sz: 0.9 }); // butterfly sleeves
  k.cyl(0.05, 0.05, 0.08, color, { y: 1.45 }, 8);
  k.ball(0.13, color, { y: 1.62 });
  k.ball(0.08, color, { y: 1.68, z: -0.12 });
  k.cyl(0.04, 0.045, 0.45, color, { x: 0.22, y: 1.02, z: 0.08, rx: -0.6 }, 6);
  if (fan)
    k.add(new CylinderGeometry(0.16, 0.16, 0.02, 10, 1, false, 0, Math.PI), color, {
      x: 0.24,
      y: 1.35,
      z: 0.28,
      rx: Math.PI / 2,
    });
  else k.box(0.2, 0.26, 0.05, color, { x: 0.18, y: 1.15, z: 0.2, rx: -0.4 }); // a book
  return k;
}

function bench(k: Kit, x: number, z: number, ry: number) {
  const w = "#8a5a3a";
  const c = "#c9c1b3";
  const at = (u: number, v: number, y: number) => ({
    x: x + Math.cos(ry) * u + Math.sin(ry) * v,
    y,
    z: z - Math.sin(ry) * u + Math.cos(ry) * v,
    ry,
  });
  for (const u of [-0.65, 0.65]) k.box(0.12, 0.42, 0.45, c, at(u, 0, 0));
  for (const v of [-0.15, 0, 0.15]) k.box(1.6, 0.05, 0.12, w, at(0, v, 0.42));
  for (const y of [0.55, 0.72]) k.box(1.6, 0.1, 0.04, w, at(0, -0.24, y));
}

function lamp(k: Kit, x: number, z: number) {
  k.cyl(0.18, 0.24, 0.5, IRON, { x, z }, 8);
  k.cyl(0.06, 0.08, 3.4, IRON, { x, y: 0.5, z }, 8);
  k.box(1.0, 0.06, 0.06, IRON, { x, y: 3.6, z });
  for (const side of [-0.48, 0.48]) {
    k.cyl(0.02, 0.02, 0.2, IRON, { x: x + side, y: 3.6, z }, 4);
    k.ball(0.19, "#fff7e2", { x: x + side, y: 3.88, z });
  }
  k.ball(0.22, "#fff7e2", { x, y: 4.1, z });
}

function swings(k: Kit, x: number, z: number, ry: number, i: number) {
  const col = i ? "#d63c62" : "#1b8e8e";
  const along = (u: number) => ({ x: x + Math.cos(ry) * u, z: z - Math.sin(ry) * u });
  for (const u of [-1.6, 1.6])
    for (const lean of [-0.25, 0.25]) k.cyl(0.05, 0.06, 2.6, col, { ...along(u), y: 0, rx: lean, ry }, 6);
  k.cyl(0.05, 0.05, 3.3, col, { ...along(0), y: 2.5, rz: Math.PI / 2, ry }, 6);
  for (const u of [-0.7, 0.7]) {
    for (const v of [-0.18, 0.18]) k.cyl(0.01, 0.01, 1.9, "#bbbbbb", { ...along(u + v), y: 0.6, ry }, 3);
    k.box(0.55, 0.05, 0.22, "#f2a516", { ...along(u), y: 0.58, ry });
  }
}

function slide(k: Kit, x: number, z: number, ry: number, i: number) {
  const col = i ? "#2c56b8" : "#d63c62";
  k.box(1, 1.8, 1, "#f2a516", { x, z, ry });
  k.box(1.2, 0.1, 1.2, col, { x, y: 1.8, z, ry });
  k.box(0.7, 0.06, 3, "#e6e8ea", { x: x + Math.sin(ry) * 1.9, y: 0.95, z: z + Math.cos(ry) * 1.9, ry, rx: 0.55 });
  for (let s = 0; s < 6; s++)
    k.box(0.7, 0.05, 0.12, col, { x: x - Math.sin(ry) * 0.7, y: 0.3 * s, z: z - Math.cos(ry) * 0.7, ry });
}

function seesaw(k: Kit, x: number, z: number, ry: number) {
  k.box(0.3, 0.45, 0.3, "#2f6b2a", { x, z, ry });
  k.box(3, 0.08, 0.3, "#f2a516", { x, y: 0.5, z, ry, rz: 0.15 });
  for (const u of [-1.35, 1.35])
    k.cyl(0.03, 0.03, 0.3, "#1d1b2a", { x: x + Math.cos(ry) * u, y: 0.55 + u * 0.15, z: z - Math.sin(ry) * u }, 5);
}

function sorbetes(k: Kit, x: number, z: number, ry: number) {
  const at = (u: number, v: number, y: number) => ({
    x: x + Math.cos(ry) * u + Math.sin(ry) * v,
    y,
    z: z - Math.sin(ry) * u + Math.cos(ry) * v,
    ry,
  });
  k.box(1.3, 0.75, 0.8, "#f4d78f", at(0, 0, 0.45));
  k.box(1.32, 0.18, 0.82, "#d63c62", at(0, 0, 0.6));
  k.box(1.32, 0.12, 0.82, "#2c56b8", at(0, 0, 0.95));
  for (const u of [-0.32, 0.32]) {
    k.cyl(0.24, 0.24, 0.22, "#e9eef0", at(u, 0, 1.2), 14);
    k.add(new SphereGeometry(0.24, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), "#2c56b8", at(u, 0, 1.42));
  }
  for (const u of [-0.5, 0.5]) k.cyl(0.25, 0.25, 0.08, IRON, { ...at(u, 0.42, 0.25), rz: Math.PI / 2 }, 14);
  k.cyl(0.02, 0.02, 1.7, "#dddddd", at(0.6, 0, 0.5), 5);
  const colours = ["#d63c62", "#f4d78f", "#1b8e8e", "#f2a516"];
  for (let s = 0; s < 8; s++)
    k.add(
      new ConeGeometry(1.1, 0.5, 8, 1, true, (s / 8) * Math.PI * 2, Math.PI / 4).translate(0, 0.25, 0),
      colours[s % 4],
      at(0.6, 0, 2.15),
    );
}

function kiosk(k: Kit, x: number, z: number, ry: number, i: number) {
  const at = (u: number, v: number, y: number) => ({
    x: x + Math.cos(ry) * u + Math.sin(ry) * v,
    y,
    z: z - Math.sin(ry) * u + Math.cos(ry) * v,
    ry,
  });
  const wood = ["#9a6b47", "#7f5a3d", "#b0815a"][i % 3];
  k.box(3, 2.4, 2.4, wood, at(0, -0.1, 0));
  k.box(2.6, 0.9, 0.12, "#3a2c25", at(0, 1.12, 1.0)); // the open counter window
  k.box(2.8, 0.12, 0.6, "#e9dcc4", at(0, 1.25, 0.95)); // counter
  const stripes = ["#d63c62", "#fdfaf3"];
  for (let s = 0; s < 6; s++) k.box(0.52, 0.06, 1.2, stripes[s % 2], { ...at(-1.3 + s * 0.52, 1.5, 2.4), rx: 0.35 });
  k.box(3.3, 0.18, 2.7, "#e9dcc4", at(0, -0.1, 2.4));
  for (const u of [-0.8, 0.8]) {
    k.cyl(0.04, 0.04, 0.6, IRON, at(u, 2.3, 0), 5);
    k.cyl(0.32, 0.32, 0.04, "#f4ede0", at(u, 2.3, 0.62), 12);
  }
}

function fence(k: Kit, obstacles: Obstacles, a: Pt, b: Pt, gate: Pt, gap: number) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len;
  const uz = (b[1] - a[1]) / len;
  const ry = Math.atan2(-uz, ux); // turns a box's length (x) along the fence
  // skip the stretch across the gate
  const tg = (gate[0] - a[0]) * ux + (gate[1] - a[1]) * uz;
  const off = Math.abs(-(gate[0] - a[0]) * uz + (gate[1] - a[1]) * ux);
  const runs: [number, number][] =
    off < 1 && tg > -gap && tg < len + gap
      ? [
          [0, tg - gap],
          [tg + gap, len],
        ]
      : [[0, len]];
  for (const [t0, t1] of runs) {
    if (t1 - t0 < 0.5) continue;
    const at = (t: number) => ({ x: a[0] + ux * t, z: a[1] + uz * t });
    const mid = at((t0 + t1) / 2);
    k.box(t1 - t0, 0.55, 0.28, "#f6f1e6", { ...mid, ry });
    k.box(t1 - t0, 0.06, 0.08, IRON, { ...mid, y: 1.6, ry });
    for (let t = t0; t <= t1; t += 2.6) k.box(0.32, 1.85, 0.32, "#fbf7ee", { ...at(t), ry });
    for (let t = t0 + 0.15; t < t1; t += 0.3) k.box(0.035, 1.1, 0.035, IRON, { ...at(t), y: 0.55 });
    const p = at(t0);
    const q = at(t1);
    obstacles.addSegment(p.x, p.z, q.x, q.z, 1.8);
  }
}

/** A rectangle around (x, z), turned by ry, as a flat point list for collisions. */
function rect(x: number, z: number, ry: number, hw: number, hd: number) {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  const corner = (u: number, v: number) => [x + c * u + s * v, z - s * u + c * v];
  return [...corner(-hw, -hd), ...corner(hw, -hd), ...corner(hw, hd), ...corner(-hw, hd)];
}

/** Hangs a shop's sign on the wall of its building that faces the street. */
/** Hangs a sign on the wall of the building at (px, pz) that faces the street, or `street` if one is named. */
function signOnBuilding(px: number, pz: number, name: string, index: number, street?: string): SignPlacement | null {
  let best: { b: (typeof buildings)[number]; d: number } | null = null;
  for (const b of buildings) {
    if (b.kind === "canopy") continue;
    const p = b.points;
    if (inside(p, px, pz)) {
      best = { b, d: 0 };
      break;
    }
    for (let i = 0; i < p.length; i += 2) {
      const d = Math.hypot(p[i] - px, p[i + 1] - pz);
      if (d < 7 && (!best || d < best.d)) best = { b, d };
    }
  }
  if (!best) return null;
  const p = best.b.points;
  const n = p.length / 2;
  let sa = 0;
  for (let i = 0; i < n; i++) sa += p[i * 2] * p[((i + 1) % n) * 2 + 1] - p[((i + 1) % n) * 2] * p[i * 2 + 1];
  const ccw = sa > 0;
  let pick: {
    mx: number;
    mz: number;
    nx: number;
    nz: number;
    len: number;
    score: number;
    ux: number;
    uz: number;
  } | null = null;
  for (let i = 0; i < n; i++) {
    const ax = p[i * 2];
    const az = p[i * 2 + 1];
    const bx = p[((i + 1) % n) * 2];
    const bz = p[((i + 1) % n) * 2 + 1];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 2.5) continue;
    const ux = (bx - ax) / len;
    const uz = (bz - az) / len;
    const nx = ccw ? uz : -uz;
    const nz = ccw ? -ux : ux;
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const road = nearestRoad(mx + nx * 2, mz + nz * 2);
    if (street && road.name !== street) continue;
    const score = road.d - len * 0.1 + Math.hypot(mx - px, mz - pz) * 0.2;
    if (!pick || score < pick.score) pick = { mx, mz, nx, nz, len, score, ux, uz };
  }
  if (!pick) return null;
  const h = 0.62;
  const w = Math.min(pick.len * 0.8, 5.5);
  return {
    name,
    x: pick.mx + pick.nx * 0.12,
    y: 2.75,
    z: pick.mz + pick.nz * 0.12,
    ry: Math.atan2(pick.nx, pick.nz),
    w,
    h,
    index,
  };
}
