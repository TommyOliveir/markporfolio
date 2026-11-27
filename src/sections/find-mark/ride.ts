// Riding Molo's traffic: the cabin you sit in, and where the camera goes, for a jeepney, a tricycle or
// a car.
//
// The vehicles in traffic.ts are small closed models seen from the street. When you climb into one,
// its outer shell hides (while you look from inside) and a cabin built at real size takes its place on
// the same moving object:
// - a jeepney: the two long side benches in red vinyl, open side windows, grab rails and straps, the
//   open back step, the driver at the wheel with a rosary on the mirror, and the long bonnet ahead;
// - a tricycle: the sidecar's bench under its little roof, with the driver on the motorbike alongside
//   (or you on the pillion behind him);
// - a car: the front passenger seat or the back seat, with the dashboard and bonnet ahead.
//
// Local frame: +z is forward, +x is the vehicle's left side (its right, the kerb side, is -x).

import { CylinderGeometry, Group, Mesh, TorusGeometry, Vector3, type BufferGeometry, type Material } from "three";
import { seeded } from "@/lib/seeded";
import { Kit } from "./kit";
import { Person, crowdLook } from "./people";

export type RideKind = "jeepney" | "tricycle" | "car";
export type RideView = "passenger" | "front" | "outside";
type Seat = { at: Vector3; look: number };

const CHROME = "#cfd4d8";
const TYRE = "#1f1f22";

/**
 * Where you sit for each view, in the vehicle's frame, and which way you face to begin with (0 is
 * straight ahead, positive turns to the left). "front" is the seat nearest the driver.
 */
export const SEATS: Record<RideKind, Record<Exclude<RideView, "outside">, Seat>> = {
  jeepney: {
    // the right-hand bench near the back, looking across and ahead at the cabin and out of the windows
    passenger: { at: new Vector3(-0.66, 2.0, -2.65), look: 0.45 },
    // up front beside the driver, looking out through the windscreen
    front: { at: new Vector3(-0.42, 2.02, 1.45), look: 0 },
  },
  tricycle: {
    // in the sidecar, looking ahead past the driver
    passenger: { at: new Vector3(0.45, 1.3, -0.1), look: -0.15 },
    // riding pillion behind the driver on the motorbike
    front: { at: new Vector3(-0.45, 1.62, -0.55), look: 0 },
  },
  car: {
    // the back seat, on the kerb side
    passenger: { at: new Vector3(-0.42, 1.18, -1.05), look: 0.1 },
    // the front passenger seat
    front: { at: new Vector3(-0.42, 1.2, 0.05), look: 0 },
  },
};

/** How fast each kind goes while you're aboard (a touch slower than usual, for the view), m/s. */
export const CRUISE: Record<RideKind, number> = { jeepney: 5.5, tricycle: 5, car: 6.5 };

/** The cabin and its riders for the vehicle you climbed into. `colors` are its outside paint and trim. */
export function buildCabin(kind: RideKind, colors: [string, string], material: Material) {
  const [body, trim] = colors;
  const k = new Kit();
  const people: Person[] = [];
  const rand = seeded(Math.round((body.charCodeAt(1) + trim.charCodeAt(2)) * 7));
  const group = new Group();
  const person = () => new Person({ ...crowdLook(rand), umbrella: undefined, backpack: undefined }, material);
  /** someone sitting with their seat at `seat` metres up, at (x, z), facing `ry` */
  const seated = (p: Person, seat: number, x: number, z: number, ry: number) => {
    p.root.position.set(x, seat - 0.81, z);
    p.root.rotation.y = ry;
    p.legL.rotation.x = p.legR.rotation.x = -1.35;
    group.add(p.root);
    people.push(p);
    return p;
  };

  if (kind === "jeepney") jeepneyCabin(k, body, trim);
  else if (kind === "tricycle") tricycleCabin(k, body);
  else carCabin(k, body);

  // the driver, and on a jeepney a few passengers on the benches
  if (kind === "jeepney") {
    const driver = seated(person(), 1.12, 0.42, 1.6, 0);
    driver.armL.rotation.x = driver.armR.rotation.x = -1.1;
    for (const [x, z] of [
      [0.7, -0.3],
      [0.7, -1.4],
      [0.7, -2.4],
      [-0.7, 0.6],
      [-0.7, -0.6],
    ])
      seated(person(), 1.12, x, z, x > 0 ? -Math.PI / 2 : Math.PI / 2);
  } else if (kind === "tricycle") {
    // astride the motorbike, hands on the bars
    const driver = seated(person(), 1.0, -0.45, -0.05, 0);
    driver.legL.rotation.x = driver.legR.rotation.x = -1.0;
    driver.legL.rotation.z = 0.25;
    driver.legR.rotation.z = -0.25;
    driver.armL.rotation.x = driver.armR.rotation.x = -1.0;
  } else {
    const driver = seated(person(), 0.62, 0.42, 0.05, 0);
    driver.armL.rotation.x = driver.armR.rotation.x = -1.15;
  }

  const geometry = k.build()!;
  const geometries: BufferGeometry[] = [geometry];
  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = true;
  group.add(mesh);

  return {
    group,
    /** the driver and passengers (the walk gives them realistic bodies) */
    people,
    /** a little bump and nodding along as you go over the street */
    update(t: number, speed: number) {
      const bump = speed > 0.5 ? Math.sin(t * (kind === "tricycle" ? 13 : 9)) * 0.012 : 0;
      people.forEach((p, i) => {
        p.root.position.y += bump - (p.root.userData.bump ?? 0);
        p.root.userData.bump = bump;
        p.head.rotation.x = Math.sin(t * 0.7 + i) * 0.06;
        if (i > 0) p.head.rotation.y = Math.sin(t * 0.3 + i * 2) * 0.4;
      });
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      people.forEach((p) => p.dispose());
    },
  };
}

// ---------------------------------------------------------------------------------------------
// The cabins

function jeepneyCabin(k: Kit, body: string, stripe: string) {
  const FLOOR = 0.75;
  const SEAT = 1.12;
  const CEILING = 2.35;
  const BACK = -3.0;
  const FRONT = 1.55;
  const span = FRONT - BACK;
  const mid = (FRONT + BACK) / 2;

  // floor, the low side panels (painted inside, with a stripe) and the back step
  k.box(1.86, 0.06, span + 0.6, "#3b3530", { y: FLOOR - 0.06, z: mid + 0.3 });
  for (const sx of [-1, 1]) {
    k.box(0.06, SEAT - FLOOR + 0.35, span, "#f3ece0", { x: sx * 0.95, y: FLOOR, z: mid });
    k.box(0.07, 0.06, span, stripe, { x: sx * 0.95, y: SEAT + 0.18, z: mid });
    k.box(0.08, 0.5, span, body, { x: sx * 0.99, y: FLOOR - 0.3, z: mid });
  }
  k.box(1.2, 0.08, 0.4, CHROME, { y: FLOOR - 0.35, z: BACK - 0.2 });
  for (const sx of [-1, 1]) k.cyl(0.025, 0.025, 1.3, CHROME, { x: sx * 0.75, y: FLOOR, z: BACK + 0.05 }, 6);

  // the two long benches in red vinyl, facing each other, with backrests against the panels
  for (const sx of [-1, 1]) {
    k.box(0.42, 0.1, span - 0.3, "#8e2230", { x: sx * 0.7, y: SEAT - 0.1, z: mid - 0.1 });
    k.box(0.4, SEAT - FLOOR - 0.1, span - 0.3, "#5a1820", { x: sx * 0.7, y: FLOOR, z: mid - 0.1 });
    k.box(0.07, 0.4, span - 0.3, "#8e2230", { x: sx * 0.89, y: SEAT + 0.05, z: mid - 0.1 });
  }

  // open side windows: pillars, a rail along the top, the roof edge in the body colour
  for (let z = FRONT; z >= BACK - 0.01; z -= 0.9)
    for (const sx of [-1, 1]) k.box(0.08, CEILING - SEAT - 0.35, 0.1, body, { x: sx * 0.96, y: SEAT + 0.35, z });
  for (const sx of [-1, 1]) {
    k.box(0.07, 0.12, span, body, { x: sx * 0.96, y: CEILING - 0.12, z: mid });
    k.box(0.06, 0.05, span, stripe, { x: sx * 0.97, y: CEILING - 0.2, z: mid });
  }

  // the ceiling, two chrome grab rails with straps, and a strip of little coloured lights
  k.box(2.0, 0.08, span + 0.4, "#f4efe4", { y: CEILING, z: mid });
  k.box(2.1, 0.1, span + 0.5, body, { y: CEILING + 0.08, z: mid });
  for (const sx of [-1, 1]) {
    k.add(new CylinderGeometry(0.02, 0.02, span - 0.2, 6).rotateX(Math.PI / 2), CHROME, {
      x: sx * 0.42,
      y: CEILING - 0.14,
      z: mid,
    });
    for (let z = FRONT - 0.5; z > BACK + 0.3; z -= 0.8)
      k.add(new TorusGeometry(0.035, 0.008, 4, 10), "#f2a516", { x: sx * 0.42, y: CEILING - 0.22, z, ry: Math.PI / 2 });
  }
  const bulbs = ["#f2a516", "#d63c62", "#2c56b8", "#1b8e8e"];
  for (let i = 0, z = FRONT - 0.3; z > BACK; i++, z -= 0.6) k.ball(0.035, bulbs[i % 4], { y: CEILING - 0.03, z });

  // up front: the dashboard, the steering wheel (the driver sits on the left, +x), the windscreen frame
  k.box(1.9, 0.22, 0.3, "#2a2522", { y: SEAT + 0.05, z: FRONT + 0.8 });
  k.box(1.9, 0.04, 0.34, "#5a4a3e", { y: SEAT + 0.27, z: FRONT + 0.78 });
  k.add(new TorusGeometry(0.19, 0.025, 6, 20), "#1d1b1a", { x: 0.42, y: SEAT + 0.42, z: FRONT + 0.45, rx: -1.1 });
  k.cyl(0.025, 0.025, 0.3, "#1d1b1a", { x: 0.42, y: SEAT + 0.25, z: FRONT + 0.55, rx: -1.1 }, 6);
  for (const sx of [-1, 1])
    k.box(0.08, CEILING - SEAT - 0.4, 0.08, body, { x: sx * 0.93, y: SEAT + 0.4, z: FRONT + 0.95 });
  k.box(1.9, 0.12, 0.1, body, { y: CEILING - 0.12, z: FRONT + 0.95 });
  // the mirror with a rosary hanging from it, and a little vase of plastic flowers on the dash
  k.box(0.32, 0.1, 0.04, "#1d1b1a", { y: CEILING - 0.3, z: FRONT + 0.85 });
  for (let b = 0; b < 9; b++) {
    const a = (b / 8) * Math.PI;
    k.ball(0.012, "#f6ecd2", { x: Math.cos(a) * 0.05, y: CEILING - 0.34 - Math.sin(a) * 0.14, z: FRONT + 0.85 }, 5, 4);
  }
  k.box(0.02, 0.06, 0.012, "#c9a046", { y: CEILING - 0.53, z: FRONT + 0.85 });
  k.cyl(0.03, 0.04, 0.1, "#2c56b8", { x: -0.6, y: SEAT + 0.31, z: FRONT + 0.75 }, 8);
  ["#d63c62", "#f2a516", "#fdfaf3"].forEach((c, f) =>
    k.ball(0.03, c, { x: -0.6 + (f - 1) * 0.03, y: SEAT + 0.46, z: FRONT + 0.75 }, 6, 4),
  );
  // the coin tray by the driver ("bayad po": passengers pass their fare forward)
  k.box(0.18, 0.08, 0.12, "#c9a046", { x: 0.15, y: SEAT + 0.31, z: FRONT + 0.7 });

  // the long bonnet ahead, with its chrome strip and a little chrome horse
  k.box(1.9, 0.5, 1.6, body, { y: FLOOR + 0.1, z: FRONT + 1.75 });
  k.box(1.92, 0.05, 1.62, CHROME, { y: FLOOR + 0.6, z: FRONT + 1.75 });
  k.box(1.94, 0.08, 1.6, stripe, { y: FLOOR + 0.35, z: FRONT + 1.75 });
  k.cyl(0.03, 0.05, 0.25, CHROME, { y: FLOOR + 0.65, z: FRONT + 2.4 }, 6);
  k.ball(0.06, CHROME, { y: FLOOR + 0.92, z: FRONT + 2.42 }, 8, 6);
}

function tricycleCabin(k: Kit, color: string) {
  // the sidecar (on the left, +x): a bench, low sides, a front panel with a little plastic windscreen,
  // a roof on four poles reaching over the motorbike too
  k.box(1.1, 0.06, 1.5, "#3b3530", { x: 0.45, y: 0.36, z: 0 });
  k.box(0.85, 0.12, 0.55, "#8e2230", { x: 0.45, y: 0.62, z: -0.25 });
  k.box(0.85, 0.5, 0.08, "#8e2230", { x: 0.45, y: 0.7, z: -0.55 });
  k.box(0.06, 0.5, 1.5, color, { x: 1.0, y: 0.42, z: 0 });
  k.box(1.1, 0.75, 0.08, color, { x: 0.45, y: 0.42, z: 0.75 });
  k.box(1.0, 0.35, 0.04, "#cfe3ea", { x: 0.45, y: 1.17, z: 0.75 });
  k.box(1.92, 0.08, 2.0, color, { x: 0.1, y: 1.75, z: -0.05 });
  k.box(1.8, 0.03, 1.9, "#f4efe4", { x: 0.1, y: 1.72, z: -0.05 });
  for (const [x, z] of [
    [-0.15, 0.9],
    [-0.15, -1.0],
    [0.98, 0.7],
    [0.98, -0.8],
  ])
    k.cyl(0.025, 0.025, 1.0, CHROME, { x, y: 0.75, z }, 4);
  // the motorbike alongside (on the right, -x): seat, tank, handlebars, front wheel and light
  k.box(0.32, 0.12, 0.9, "#3a2c25", { x: -0.45, y: 0.9, z: -0.25 });
  k.box(0.3, 0.25, 0.4, "#2a2b2e", { x: -0.45, y: 0.85, z: 0.35 });
  k.cyl(0.03, 0.03, 0.75, CHROME, { x: -0.45, y: 1.12, z: 0.62, rz: Math.PI / 2 }, 5);
  k.ball(0.09, "#fff9e0", { x: -0.45, y: 0.98, z: 0.86 });
  k.add(new CylinderGeometry(0.28, 0.28, 0.12, 14).rotateZ(Math.PI / 2), TYRE, { x: -0.45, y: 0.28, z: 0.85 });
  k.box(0.12, 0.5, 0.5, "#2a2b2e", { x: -0.45, y: 0.28, z: 0.85 });
}

function carCabin(k: Kit, color: string) {
  // floor, the two front seats and the back bench, door panels, pillars and the roof lining
  k.box(1.7, 0.05, 3.2, "#2b2a2e", { y: 0.32, z: -0.4 });
  for (const sx of [-1, 1]) {
    k.box(0.5, 0.12, 0.5, "#3c3a40", { x: sx * 0.42, y: 0.52, z: 0 });
    k.box(0.5, 0.6, 0.12, "#3c3a40", { x: sx * 0.42, y: 0.6, z: -0.3, rx: 0.15 });
    k.box(0.06, 0.45, 2.6, color, { x: sx * 0.84, y: 0.35, z: -0.4 });
    k.box(0.07, 0.05, 2.6, "#d9d4c8", { x: sx * 0.82, y: 0.78, z: -0.4 });
    for (const z of [0.75, -0.4, -1.55])
      k.box(0.08, 0.68, 0.1, color, { x: sx * 0.8, y: 0.8, z, rx: z > 0 ? -0.35 : z < -1 ? 0.35 : 0 });
  }
  k.box(1.5, 0.12, 0.55, "#3c3a40", { y: 0.5, z: -1.05 });
  k.box(1.5, 0.55, 0.12, "#3c3a40", { y: 0.58, z: -1.35, rx: 0.12 });
  k.box(1.66, 0.05, 2.0, "#d9d4c8", { y: 1.5, z: -0.35 });
  k.box(1.7, 0.06, 2.1, color, { y: 1.55, z: -0.35 });
  // the dashboard with its wheel on the left, the windscreen frame and the mirror
  k.box(1.6, 0.3, 0.35, "#26252a", { y: 0.75, z: 0.62 });
  k.add(new TorusGeometry(0.17, 0.022, 6, 20), "#151417", { x: 0.42, y: 0.95, z: 0.42, rx: -1.15 });
  k.box(1.6, 0.08, 0.08, color, { y: 1.47, z: 0.72 });
  k.box(0.22, 0.07, 0.03, "#151417", { y: 1.36, z: 0.68 });
  // the bonnet ahead
  k.box(1.78, 0.35, 1.2, color, { y: 0.55, z: 1.45 });
  k.box(1.7, 0.18, 0.1, CHROME, { y: 0.55, z: 2.06 });
}

const tmp = new Vector3();

/**
 * Puts the camera in your seat on a moving vehicle: at the seat (moved and turned with it), facing the
 * seat's way plus however far you've dragged to look round (`turn`) and up or down (`tilt`).
 */
export function seatCamera(
  camera: { position: Vector3; lookAt(v: Vector3): void },
  vehicle: { position: Vector3; rotation: { y: number } },
  kind: RideKind,
  view: Exclude<RideView, "outside">,
  turn: number,
  tilt: number,
) {
  const seat = SEATS[kind][view];
  const h = vehicle.rotation.y;
  const c = Math.cos(h);
  const s = Math.sin(h);
  camera.position.set(
    vehicle.position.x + seat.at.x * c + seat.at.z * s,
    vehicle.position.y + seat.at.y,
    vehicle.position.z - seat.at.x * s + seat.at.z * c,
  );
  const a = h + seat.look + turn;
  const down = Math.max(-0.7, Math.min(0.7, tilt));
  tmp.set(
    camera.position.x + Math.sin(a) * Math.cos(down),
    camera.position.y - Math.sin(down),
    camera.position.z + Math.cos(a) * Math.cos(down),
  );
  camera.lookAt(tmp);
}
