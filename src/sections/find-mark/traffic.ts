// Jeepneys, tricycles and cars on Molo's streets. They follow the real one-way loop around the plaza
// (Lopez Jaena → M.H. del Pilar → Jocson → San Pedro, from the OpenStreetMap data), and the two-way
// run along Avanceña and Locsin, keeping to the right. They slow behind each other and stop for you.

import {
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
} from "three";
import { seeded } from "@/lib/seeded";
import type { Circle } from "./collide";
import { Kit } from "./kit";
import { roads } from "./molo-map";

type Kind = "jeepney" | "tricycle" | "car";

function road(name: string, first?: [number, number]) {
  const list = roads.filter((r) => r.name === name);
  const r = first ? list.find((l) => Math.hypot(l.points[0] - first[0], l.points[1] - first[1]) < 0.5) : list[0];
  if (!r) return [];
  const pts: [number, number][] = [];
  for (let i = 0; i < r.points.length; i += 2) pts.push([r.points[i], r.points[i + 1]]);
  return pts;
}

/** Shifts a line to its right-hand side (drivers keep right in the Philippines). */
function keepRight(pts: [number, number][], offset: number) {
  return pts.map((p, i) => {
    const a = pts[Math.max(i - 1, 0)];
    const b = pts[Math.min(i + 1, pts.length - 1)];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const l = Math.hypot(dx, dz) || 1;
    return [p[0] - (dz / l) * offset, p[1] + (dx / l) * offset] as [number, number];
  });
}

function dedupe(pts: [number, number][]) {
  return pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.5);
}

type Route = { curve: CatmullRomCurve3; length: number; loop: boolean };

function makeRoute(pts: [number, number][], loop: boolean, offset: number): Route {
  const shifted = keepRight(dedupe(pts), offset);
  const curve = new CatmullRomCurve3(
    shifted.map(([x, z]) => new Vector3(x, 0, z)),
    loop,
    "centripetal",
  );
  curve.arcLengthDivisions = 600;
  return { curve, length: curve.getLength(), loop };
}

export function buildRoutes() {
  const lopez = road("Lopez Jaena Street", [-76.6, -51.9]);
  const delPilar = road("Marcelo H. del Pilar Street").slice(0, 2);
  const jocson = road("Jocson Street", [83.1, 63.6]);
  const sanPedro = road("San Pedro Street", [-0.1, -95.4]);
  const loop = [...lopez, ...delPilar.slice(1), ...jocson.slice(1), ...sanPedro.slice(1, -1)];
  const avancena = road("Avanceña Street");
  const locsin = road("Locsin Street");
  return {
    loop: makeRoute(loop, true, 2.4),
    westbound: makeRoute([...locsin, ...avancena.slice(1)], false, 2.2),
    eastbound: makeRoute([...[...avancena].reverse(), ...[...locsin].reverse().slice(1)], false, 2.2),
  };
}

// ---------------------------------------------------------------------------------------------
// The vehicles

const BODY = ["#d9dcdf", "#f3f1ea", "#c8333a", "#2c56b8", "#e6ab2e", "#1b8e8e"];
const STRIPE = ["#d63c62", "#2c56b8", "#f2a516", "#1b8e8e", "#6b4aa6"];
const CHROME = "#cfd4d8";
const TYRE = "#1f1f22";

function jeepney(i: number) {
  const k = new Kit();
  const body = BODY[i % BODY.length];
  const s1 = STRIPE[i % STRIPE.length];
  const s2 = STRIPE[(i + 2) % STRIPE.length];
  // Iloilo jeepneys: long and low, with a sleek car-like nose
  k.box(1.95, 0.75, 6.2, body, { y: 0.45 });
  k.box(1.9, 0.5, 1.5, body, { y: 1.2, z: 2.3 }); // the bonnet
  k.box(1.92, 0.06, 1.55, CHROME, { y: 1.7, z: 2.3 });
  k.box(1.8, 0.62, 0.12, "#2f3a46", { y: 1.72, z: 1.5, rx: -0.35 }); // windscreen
  k.box(1.95, 0.95, 4.5, body, { y: 1.2, z: -0.75 });
  k.box(2.0, 0.55, 4.3, "#262a30", { y: 1.45, z: -0.85 }); // open side windows
  for (let z = 1.15; z > -3; z -= 0.9) for (const x of [-0.985, 0.985]) k.box(0.05, 0.55, 0.1, body, { x, y: 1.45, z });
  k.box(2.1, 0.14, 5.0, body, { y: 2.0, z: -0.6 }); // roof
  k.box(1.7, 0.06, 4.4, CHROME, { y: 2.14, z: -0.7 }); // roof rack
  k.box(1.3, 0.28, 0.08, "#fdfaf3", { y: 2.2, z: 1.75 }); // route board
  for (const x of [-0.99, 0.99]) {
    k.box(0.03, 0.12, 5.9, s1, { x, y: 0.95, z: 0 });
    k.box(0.03, 0.08, 5.9, s2, { x, y: 0.75, z: 0 });
    k.box(0.03, 0.1, 4.5, s2, { x, y: 1.86, z: -0.75 });
  }
  k.box(1.7, 0.42, 0.1, CHROME, { y: 0.85, z: 3.1 }); // grille
  for (const x of [-0.7, 0.7]) k.ball(0.13, "#fff9e0", { x, y: 1.15, z: 3.06 });
  k.box(2.05, 0.16, 0.18, CHROME, { y: 0.5, z: 3.15 });
  k.box(2.05, 0.16, 0.18, CHROME, { y: 0.5, z: -3.12 });
  k.box(0.9, 1.2, 0.05, "#1a1d22", { y: 0.85, z: -3.1 }); // the back entrance
  k.box(0.05, 0.3, 0.2, CHROME, { x: 1.05, y: 1.8, z: 1.6 }); // mirrors
  k.box(0.05, 0.3, 0.2, CHROME, { x: -1.05, y: 1.8, z: 1.6 });
  k.cyl(0.03, 0.05, 0.25, CHROME, { y: 1.73, z: 2.95 }, 6); // a little horse on the bonnet
  // passengers along the benches
  const heads = ["#2b211c", "#1d1b1a", "#3a2a20"];
  for (let n = 0; n < 6; n++)
    k.ball(0.15, heads[n % 3], { x: n % 2 ? 0.6 : -0.6, y: 1.5, z: 0.6 - Math.floor(n / 2) * 1.2 });
  wheels(k, 0.95, [2.2, -2.1], 0.42);
  return k.build()!;
}

function tricycle(i: number) {
  const k = new Kit();
  const c = STRIPE[(i + 1) % STRIPE.length];
  // the motorbike
  k.box(0.35, 0.45, 1.5, "#2a2b2e", { x: -0.45, y: 0.45, z: 0.1 });
  k.box(0.3, 0.12, 0.6, "#3a2c25", { x: -0.45, y: 0.92, z: -0.1 });
  k.cyl(0.03, 0.03, 0.7, CHROME, { x: -0.45, y: 1.05, z: 0.65, rz: Math.PI / 2 }, 5);
  k.ball(0.09, "#fff9e0", { x: -0.45, y: 0.95, z: 0.86 });
  // the sidecar with its roof
  k.box(1.1, 0.8, 1.6, c, { x: 0.45, y: 0.35, z: 0 });
  k.box(1.12, 0.4, 1.4, "#262a30", { x: 0.45, y: 1.15, z: -0.05 });
  k.box(1.9, 0.08, 2.0, c, { x: 0.1, y: 1.75, z: -0.05 });
  for (const [x, z] of [
    [-0.15, 0.9],
    [-0.15, -1.0],
    [0.98, 0.7],
    [0.98, -0.8],
  ])
    k.cyl(0.025, 0.025, 1.0, CHROME, { x, y: 0.8, z }, 4);
  // the driver
  k.cyl(0.18, 0.2, 0.55, "#f4f1ea", { x: -0.45, y: 1.0, z: -0.1 }, 8);
  k.ball(0.17, "#c68863", { x: -0.45, y: 1.72, z: -0.08 });
  k.add(new SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), "#d63c62", { x: -0.45, y: 1.78, z: -0.08 });
  for (const [x, z] of [
    [-0.45, 0.85],
    [-0.45, -0.65],
    [0.55, -0.1],
  ])
    k.add(new CylinderGeometry(0.28, 0.28, 0.12, 12).rotateZ(Math.PI / 2), TYRE, { x, y: 0.28, z });
  return k.build()!;
}

function car(i: number) {
  const k = new Kit();
  const c = ["#f3f1ea", "#9aa3ad", "#c8333a", "#24324d", "#d9c7a0"][i % 5];
  k.box(1.8, 0.65, 4.3, c, { y: 0.35 });
  k.box(1.6, 0.6, 2.2, c, { y: 1.0, z: -0.3 });
  k.box(1.62, 0.42, 2.0, "#2f3a46", { y: 1.07, z: -0.3 });
  k.box(1.7, 0.18, 0.1, CHROME, { y: 0.55, z: 2.16 });
  for (const x of [-0.65, 0.65]) k.ball(0.1, "#fff9e0", { x, y: 0.8, z: 2.12 });
  for (const x of [-0.65, 0.65]) k.box(0.3, 0.12, 0.05, "#b22222", { x, y: 0.82, z: -2.16 });
  wheels(k, 0.85, [1.35, -1.35], 0.34);
  return k.build()!;
}

function wheels(k: Kit, half: number, zs: number[], r: number) {
  for (const z of zs)
    for (const x of [-half, half]) {
      k.add(new CylinderGeometry(r, r, 0.26, 14).rotateZ(Math.PI / 2), TYRE, { x, y: r, z });
      k.add(new CylinderGeometry(r * 0.5, r * 0.5, 0.27, 10).rotateZ(Math.PI / 2), CHROME, { x, y: r, z });
    }
}

export type Vehicle = {
  kind: Kind;
  route: Route;
  s: number;
  speed: number;
  max: number;
  object: Group;
  heading: number;
  honked: number;
  geometry: BufferGeometry;
};

/** A closed stretch of street: a line from (ax, az) to (bx, bz), r metres either side. */
export type Zone = { ax: number; az: number; bx: number; bz: number; r: number };

function inZone(z: Zone, x: number, y: number) {
  const vx = z.bx - z.ax;
  const vz = z.bz - z.az;
  const t = Math.max(0, Math.min(1, ((x - z.ax) * vx + (y - z.az) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(x - (z.ax + vx * t), y - (z.az + vz * t)) < z.r;
}

export class Traffic {
  readonly vehicles: Vehicle[] = [];
  readonly group = new Group();
  /** called with "horn" when a jeepney stops for you */
  onHorn?: () => void;
  private p = new Vector3();
  private tan = new Vector3();

  constructor(material: Material, lite: boolean) {
    const routes = buildRoutes();
    const rand = seeded(77);
    const spawn = (route: Route, kind: Kind, i: number, at: number) => {
      const geometry = kind === "jeepney" ? jeepney(i) : kind === "tricycle" ? tricycle(i) : car(i);
      const mesh = new Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const object = new Group();
      object.add(mesh);
      this.group.add(object);
      const max = kind === "jeepney" ? rand.range(7, 9) : kind === "tricycle" ? rand.range(5.5, 7) : rand.range(8, 10);
      this.vehicles.push({
        kind,
        route,
        s: at * route.length,
        speed: max,
        max,
        object,
        heading: 0,
        honked: 0,
        geometry,
      });
    };
    const loopKinds: Kind[] = lite
      ? ["jeepney", "tricycle", "jeepney", "car"]
      : ["jeepney", "tricycle", "jeepney", "car", "jeepney", "tricycle", "car"];
    loopKinds.forEach((kind, i) => spawn(routes.loop, kind, i, i / loopKinds.length));
    (["jeepney", "car", "tricycle"] as Kind[]).forEach((kind, i) =>
      spawn(routes.westbound, kind, i + 3, 0.15 + i * 0.3),
    );
    (["car", "jeepney", "tricycle"] as Kind[]).forEach((kind, i) =>
      spawn(routes.eastbound, kind, i + 5, 0.1 + i * 0.3),
    );
    this.update(0, { x: 1e5, z: 1e5 });
  }

  /** Is any vehicle on this stretch of street? */
  clearOf(zone: Zone) {
    return !this.vehicles.some((v) => inZone(zone, v.object.position.x, v.object.position.z));
  }

  /**
   * Moves everything on; stops for anything (or anyone: you, the marching band) just ahead. While the
   * band is out, `closed` is the stretch of street they've taken over: cars wait at its edge, and any
   * already on it drive on out.
   */
  update(
    dt: number,
    player: { x: number; z: number },
    others: readonly { x: number; z: number }[] = [],
    closed: Zone | null = null,
  ) {
    for (const v of this.vehicles) {
      const r = v.route;
      let target = v.max;
      // keep a gap behind whoever is in front on the same route
      for (const o of this.vehicles) {
        if (o === v || o.route !== r) continue;
        let gap = o.s - v.s;
        if (r.loop && gap < 0) gap += r.length;
        if (gap > 0 && gap < 14) target = Math.min(target, Math.max(0, (gap - 7) * 1.2));
      }
      // stop for the visitor (honking if it's a jeepney in a hurry), and for anyone else on foot
      const fx = Math.sin(v.heading);
      const fz = Math.cos(v.heading);
      const blocks = (who: { x: number; z: number }) => {
        const dx = who.x - v.object.position.x;
        const dz = who.z - v.object.position.z;
        const ahead = dx * fx + dz * fz;
        return ahead > 0 && ahead < 9 && Math.abs(-dx * fz + dz * fx) < 1.8;
      };
      if (blocks(player)) {
        target = 0;
        if (v.speed > 2 && v.kind === "jeepney" && performance.now() - v.honked > 6000) {
          v.honked = performance.now();
          this.onHorn?.();
        }
      } else if (closed && inZone(closed, v.object.position.x, v.object.position.z)) {
        // already on the closed stretch: keep going, out of the band's way
      } else if (
        closed &&
        [3, 6, 9, 12].some((d) => inZone(closed, v.object.position.x + fx * d, v.object.position.z + fz * d))
      ) {
        target = 0; // wait at the edge of the closed stretch
      } else if (others.some(blocks)) target = 0;
      v.speed += (target - v.speed) * Math.min(dt * (target < v.speed ? 4 : 1.2), 1);
      v.s += v.speed * dt;
      if (v.s > r.length) v.s = r.loop ? v.s - r.length : 0;

      const u = v.s / r.length;
      r.curve.getPointAt(u, this.p);
      r.curve.getTangentAt(u, this.tan);
      const h = Math.atan2(this.tan.x, this.tan.z);
      let d = h - v.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      v.heading += dt === 0 ? d : d * Math.min(dt * 6, 1);
      v.object.position.set(this.p.x, 0.02, this.p.z);
      v.object.rotation.y = v.heading;
      // a little bounce on Iloilo's streets
      v.object.children[0].position.y = v.speed > 0.5 ? Math.abs(Math.sin(v.s * 1.7)) * 0.025 : 0;
    }
  }

  /** Where the vehicles are, as circles you can't walk through. */
  colliders(out: Circle[]) {
    out.length = 0;
    for (const v of this.vehicles) {
      const fx = Math.sin(v.heading);
      const fz = Math.cos(v.heading);
      const len = v.kind === "jeepney" ? 2.1 : v.kind === "car" ? 1.3 : 0.5;
      const r = v.kind === "tricycle" ? 1.0 : 1.05;
      for (const t of v.kind === "tricycle" ? [0] : [-len, 0, len])
        out.push({ x: v.object.position.x + fx * t, z: v.object.position.z + fz * t, r, h: 2 });
    }
    return out;
  }

  dispose() {
    this.vehicles.forEach((v) => v.geometry.dispose());
  }
}
