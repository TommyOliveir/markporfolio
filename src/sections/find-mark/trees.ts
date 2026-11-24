// Trees and greenery, all instanced: broad rain trees shading the plaza (on its real tree rows and
// tree points from OpenStreetMap), coconut palms around the mansion and the backyards of Molo, mango
// trees, flowering bushes (bougainvillea, gumamela), grass tufts and little flowers on the lawns.

import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  OctahedronGeometry,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from "three";
import { seeded } from "@/lib/seeded";
import { Obstacles, inside } from "./collide";
import { nearestRoad } from "./ground";
import { Kit } from "./kit";
import { swayMaterial } from "./materials";
import { areas, buildings, churchFootprint, mansionFootprint, paths, treeRows, trees as treePoints } from "./molo-map";
import { BALLOON, MANSION, SUPERMART, toWorld } from "./world";

type Kind = "rain" | "palm" | "mango" | "bush" | "bloom";
type Spot = { x: number; z: number; kind: Kind; scale: number; turn: number; tint: number };

function rainTree() {
  const k = new Kit();
  k.cyl(0.32, 0.5, 4.2, "#6b5040", {}, 8);
  for (const [a, lean] of [
    [0, 0.7],
    [2.1, 0.6],
    [4.2, 0.75],
  ])
    k.cyl(0.14, 0.24, 3, "#6b5040", { y: 3.6, ry: a, rx: lean }, 6);
  const greens = ["#4f7f35", "#5d8f3b", "#6b9b43", "#557f37"];
  const blobs: [number, number, number, number][] = [
    [0, 6.6, 0, 3.2],
    [2.8, 6.0, 0.6, 2.4],
    [-2.6, 6.1, 1.0, 2.5],
    [0.8, 6.2, -2.7, 2.4],
    [-1.2, 6.0, 2.7, 2.3],
    [1.9, 6.4, 2.1, 2.0],
    [-2.2, 6.5, -1.9, 2.1],
  ];
  blobs.forEach(([x, y, z, r], i) =>
    k.add(new IcosahedronGeometry(r, 1), greens[i % greens.length], { x, y, z, sy: 0.55 }),
  );
  return k.build()!;
}

function mangoTree() {
  const k = new Kit();
  k.cyl(0.2, 0.32, 2.4, "#5e4636", {}, 7);
  const greens = ["#2f6b2a", "#3b7a31", "#346f2c"];
  const blobs: [number, number, number, number][] = [
    [0, 4.2, 0, 2.2],
    [1.3, 3.6, 0.4, 1.5],
    [-1.2, 3.7, -0.5, 1.6],
    [0.2, 3.5, 1.4, 1.4],
    [-0.2, 5.3, -0.3, 1.3],
  ];
  blobs.forEach(([x, y, z, r], i) =>
    k.add(new IcosahedronGeometry(r, 1), greens[i % greens.length], { x, y, z, sy: 0.85 }),
  );
  return k.build()!;
}

function palmTree() {
  const k = new Kit();
  // a gently curving trunk with ring marks
  let x = 0;
  let y = 0;
  const segs = 7;
  for (let i = 0; i < segs; i++) {
    const h = 1.25;
    const lean = 0.06 + i * 0.025;
    k.cyl(0.17 - i * 0.008, 0.2 - i * 0.008, h, i % 2 ? "#8a7158" : "#7d6650", { x, y, rz: -lean }, 7);
    x += Math.sin(lean) * h;
    y += Math.cos(lean) * h;
  }
  const top = { x, y };
  // fronds: long leaves arching out and down
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + (i % 2) * 0.2;
    const leaf = new PlaneGeometry(0.9, 4.2, 1, 8).translate(0, 2.1, 0);
    const pos = leaf.getAttribute("position");
    for (let v = 0; v < pos.count; v++) {
      const ly = pos.getY(v);
      const t = ly / 4.2;
      // narrow to a point, and droop
      pos.setX(v, pos.getX(v) * (1 - t * 0.85) * (0.6 + Math.sin(t * Math.PI) * 0.6));
      pos.setZ(v, -t * t * 2.2);
    }
    leaf.computeVertexNormals();
    k.add(leaf, i % 3 ? "#5d9a3a" : "#6faa45", { x: top.x, y: top.y - 0.1, ry: a, rx: -1.1 + (i % 3) * 0.12 });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    k.ball(0.16, "#7a6a2c", { x: top.x + Math.sin(a) * 0.2, y: top.y - 0.25, z: Math.cos(a) * 0.2 }, 8, 6);
  }
  return k.build()!;
}

function bush(flowers: string | null) {
  const k = new Kit();
  const blobs: [number, number, number, number][] = [
    [0, 0.6, 0, 0.7],
    [0.5, 0.45, 0.2, 0.5],
    [-0.45, 0.5, -0.2, 0.55],
  ];
  blobs.forEach(([x, y, z, r], i) =>
    k.add(new IcosahedronGeometry(r, 1), i % 2 ? "#3f7a34" : "#4a8a3a", { x, y, z, sy: 0.85 }),
  );
  if (flowers)
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4;
      const r = 0.45 + (i % 3) * 0.12;
      k.add(new OctahedronGeometry(0.12, 0), flowers, {
        x: Math.sin(a) * r,
        y: 0.55 + (i % 4) * 0.18,
        z: Math.cos(a) * r,
      });
    }
  return k.build()!;
}

/** Three blades of grass, darker at the root. */
function tuft() {
  const pos: number[] = [];
  const col: number[] = [];
  const base = new Color("#3f6d2a");
  const tip = new Color("#a9c766");
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    const c = Math.cos(a) * 0.07;
    const s = Math.sin(a) * 0.07;
    const lean = (i - 1) * 0.08;
    pos.push(-c, 0, -s, c, 0, s, lean, 0.38 + i * 0.05, 0);
    col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  // light grass from above rather than edge-on
  const n = g.getAttribute("normal");
  for (let i = 0; i < n.count; i++) n.setXYZ(i, n.getX(i) * 0.3, 1, n.getZ(i) * 0.3);
  return g;
}

function flower() {
  const k = new Kit();
  k.cyl(0.008, 0.008, 0.22, "#4c7a33", {}, 3);
  k.add(new OctahedronGeometry(0.06, 0), "#ffffff", { y: 0.24, sy: 0.6 });
  return k.build()!;
}

const TRUNK: Record<Kind, number> = { rain: 0.5, palm: 0.3, mango: 0.4, bush: 0.55, bloom: 0.55 };

export function buildTrees(obstacles: Obstacles, lite: boolean) {
  const rand = seeded(1926);
  const spots: Spot[] = [];
  const add = (x: number, z: number, kind: Kind, scale = 1) =>
    spots.push({
      x,
      z,
      kind,
      scale: scale * rand.range(0.85, 1.15),
      turn: rand.range(0, Math.PI * 2),
      tint: rand.range(0.88, 1.08),
    });

  const plaza = areas.find((a) => a.kind === "plaza")?.points ?? [];
  const inPlaza = (x: number, z: number) => inside(plaza, x, z);

  // trees mapped one by one
  for (let i = 0; i < treePoints.length; i += 2) {
    const x = treePoints[i];
    const z = treePoints[i + 1];
    add(x, z, inPlaza(x, z) ? "rain" : rand.pick(["mango", "palm", "rain"] as const));
  }
  // rows of trees along the plaza walks
  for (const row of treeRows) {
    for (let i = 0; i < row.length - 2; i += 2) {
      const ax = row[i];
      const az = row[i + 1];
      const len = Math.hypot(row[i + 2] - ax, row[i + 3] - az);
      for (let t = 0; t <= len; t += 8) {
        const x = ax + ((row[i + 2] - ax) * t) / len;
        const z = az + ((row[i + 3] - az) * t) / len;
        add(x, z, rand.next() < 0.75 ? "rain" : "mango", 0.85);
      }
    }
  }
  // the grove beside the mansion: palms and mangoes
  for (const a of areas.filter((g) => g.kind === "grove"))
    fill(a.points, 6.5, (x, z) => add(x, z, rand.next() < 0.55 ? "palm" : "mango"));
  // palms flanking the mansion, as in the photographs
  for (const [lx, lz] of [
    [15, 1],
    [17, -5],
    [16.5, 6],
    [-15, 2],
    [-16.5, -6],
    [-14.5, 8],
    [10, 13],
    [-9, 14],
  ]) {
    const [x, z] = toWorld(MANSION, lx, lz);
    add(x, z, "palm", 1.1);
  }
  // flowering bushes in the plaza garden and along the mansion lawn
  for (const a of areas.filter((g) => g.kind === "garden"))
    fill(a.points, 2.6, (x, z) => add(x, z, rand.next() < 0.5 ? "bloom" : "bush", 0.9));

  // backyard trees all over town, wherever there's open ground
  const solid = buildings.map((b) => b.points);
  const blocked = (x: number, z: number) =>
    solid.some(
      (p) =>
        inside(p, x, z) ||
        inside(p, x + 1.5, z) ||
        inside(p, x - 1.5, z) ||
        inside(p, x, z + 1.5) ||
        inside(p, x, z - 1.5),
    ) ||
    inside(churchFootprint, x, z) ||
    inside(mansionFootprint, x, z) ||
    inPlaza(x, z) ||
    areas.some((a) => (a.kind === "churchyard" || a.kind === "parking") && inside(a.points, x, z));
  let placed = 0;
  for (let tries = 0; tries < 900 && placed < (lite ? 70 : 140); tries++) {
    const a = rand.range(0, Math.PI * 2);
    const r = Math.sqrt(rand.next()) * 200;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (blocked(x, z)) continue;
    const road = nearestRoad(x, z);
    if (road.d < road.width / 2 + 2) continue;
    if (paths.some((p) => nearLine(p, x, z, 2))) continue;
    add(x, z, rand.next() < 0.45 ? "palm" : rand.next() < 0.6 ? "mango" : "bush", rand.range(0.9, 1.2));
    placed++;
  }

  // keep the stretch of Avanceña Street between Iloilo Supermart and the Jollibee clear, so you can see
  // the supermarket's front (filtered afterwards, so the rest of town keeps the same trees)
  // (and the churchyard lawn where the hot-air balloon is tethered)
  const clear = (s: Spot) =>
    Math.hypot(s.x - SUPERMART.x, s.z - (SUPERMART.z + 8)) > 16 && Math.hypot(s.x - BALLOON.x, s.z - BALLOON.z) > 12;
  spots.splice(0, spots.length, ...spots.filter(clear));

  for (const s of spots)
    obstacles.addCircle(s.x, s.z, TRUNK[s.kind] * s.scale, s.kind === "bush" || s.kind === "bloom" ? 1 : 3);

  const meshes: InstancedMesh[] = [];
  const m = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const c = new Color();
  const kinds: [Kind, BufferGeometry, ReturnType<typeof swayMaterial>][] = [
    ["rain", rainTree(), swayMaterial(4, 0.012, undefined, true)],
    ["mango", mangoTree(), swayMaterial(2.4, 0.016, undefined, true)],
    ["palm", palmTree(), swayMaterial(3, 0.02, DoubleSide, true)],
    ["bush", bush(null), swayMaterial(0.4, 0.03)],
    ["bloom", bush("#d9467a"), swayMaterial(0.4, 0.03)],
  ];
  for (const [kind, geo, mat] of kinds) {
    const list = spots.filter((s) => s.kind === kind);
    if (!list.length) continue;
    const mesh = new InstancedMesh(geo, mat, list.length);
    list.forEach((s, i) => {
      q.setFromAxisAngle(up, s.turn);
      m.compose(new Vector3(s.x, 0, s.z), q, new Vector3(s.scale, s.scale, s.scale));
      mesh.setMatrixAt(i, m);
      // bloom bushes come in magenta, coral and golden yellow
      if (kind === "bloom") c.set(["#ffffff", "#ffd2b0", "#fff1a0"][i % 3]).multiplyScalar(s.tint);
      else c.setScalar(s.tint);
      mesh.setColorAt(i, c);
    });
    mesh.castShadow = kind !== "bush" && kind !== "bloom";
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    meshes.push(mesh);
  }

  // grass tufts and wildflowers on the lawns
  const lawns = areas.filter(
    (a) => (a.kind === "grass" || a.kind === "garden" || a.kind === "grove") && centreDistance(a.points) < 170,
  );
  const tuftSpots: [number, number][] = [];
  const flowerSpots: [number, number][] = [];
  const perM2 = lite ? 0.35 : 0.8;
  for (const a of lawns) {
    fillRandom(a.points, perM2, rand, (x, z) => {
      if (paths.some((p) => nearLine(p, x, z, 1.5))) return;
      if (rand.next() < 0.06) flowerSpots.push([x, z]);
      else tuftSpots.push([x, z]);
    });
  }
  const grass = new InstancedMesh(tuft(), swayMaterial(0.02, 0.35, DoubleSide), tuftSpots.length);
  tuftSpots.forEach(([x, z], i) => {
    q.setFromAxisAngle(up, rand.range(0, Math.PI * 2));
    const s = rand.range(0.7, 1.4);
    m.compose(new Vector3(x, 0.05, z), q, new Vector3(s, s * rand.range(0.8, 1.3), s));
    grass.setMatrixAt(i, m);
  });
  grass.receiveShadow = true;
  grass.computeBoundingSphere();
  meshes.push(grass);

  const blooms = new InstancedMesh(flower(), swayMaterial(0.05, 0.2), flowerSpots.length);
  const petals = ["#ffffff", "#f7d35a", "#f08bb0", "#ffb36b", "#c9a8f0"];
  flowerSpots.forEach(([x, z], i) => {
    q.setFromAxisAngle(up, rand.range(0, Math.PI * 2));
    m.compose(new Vector3(x, 0.05, z), q, new Vector3(1, rand.range(0.8, 1.3), 1));
    blooms.setMatrixAt(i, m);
    blooms.setColorAt(i, c.set(petals[i % petals.length]));
  });
  blooms.computeBoundingSphere();
  meshes.push(blooms);

  return meshes;
}

function centreDistance(pts: number[]) {
  let x = 0;
  let z = 0;
  for (let i = 0; i < pts.length; i += 2) {
    x += pts[i];
    z += pts[i + 1];
  }
  return Math.hypot((x * 2) / pts.length, (z * 2) / pts.length);
}

function bounds(pts: number[]) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    x0 = Math.min(x0, pts[i]);
    x1 = Math.max(x1, pts[i]);
    z0 = Math.min(z0, pts[i + 1]);
    z1 = Math.max(z1, pts[i + 1]);
  }
  return { x0, x1, z0, z1 };
}

/** Points on a jittered grid inside a polygon. */
function fill(pts: number[], spacing: number, at: (x: number, z: number) => void) {
  const b = bounds(pts);
  let row = 0;
  for (let z = b.z0 + spacing / 2; z < b.z1; z += spacing, row++)
    for (let x = b.x0 + spacing / 2 + (row % 2) * spacing * 0.5; x < b.x1; x += spacing) {
      const jx = x + Math.sin(x * 12.9 + z * 78.2) * spacing * 0.25;
      const jz = z + Math.cos(x * 39.3 + z * 11.1) * spacing * 0.25;
      if (inside(pts, jx, jz)) at(jx, jz);
    }
}

/** Random points inside a polygon, about `density` per square metre. */
function fillRandom(
  pts: number[],
  density: number,
  rand: ReturnType<typeof seeded>,
  at: (x: number, z: number) => void,
) {
  const b = bounds(pts);
  const tries = Math.min(Math.round((b.x1 - b.x0) * (b.z1 - b.z0) * density), 6000);
  for (let i = 0; i < tries; i++) {
    const x = rand.range(b.x0, b.x1);
    const z = rand.range(b.z0, b.z1);
    if (inside(pts, x, z)) at(x, z);
  }
}

function nearLine(p: number[], x: number, z: number, d: number) {
  for (let i = 0; i < p.length - 2; i += 2) {
    const ax = p[i];
    const az = p[i + 1];
    const vx = p[i + 2] - ax;
    const vz = p[i + 3] - az;
    const l2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2));
    if (Math.hypot(x - ax - vx * t, z - az - vz * t) < d) return true;
  }
  return false;
}
