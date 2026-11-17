// People: you, Mark, and the folk out enjoying the plaza. Each is a little jointed figure — legs, arms
// and head on pivots — so they can walk, wave, paint, and bob along. Facing +z.

import { BufferGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, SphereGeometry, type Material } from "three";
import { Kit } from "./kit";

export type Look = {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  shoes?: string;
  hat?: "straw" | "beret" | "cap" | "bun" | "none";
  hatColor?: string;
  skirt?: boolean;
  /** a tote bag (colour) on one shoulder */
  bag?: string;
  backpack?: string;
  /** Mark's painter's apron */
  apron?: boolean;
  umbrella?: string;
  scale?: number;
};

const mesh = (geo: BufferGeometry | null, material: Material) => {
  const m = new Mesh(geo ?? undefined, material);
  m.castShadow = true;
  return m;
};

export class Person {
  readonly root = new Group();
  readonly body = new Group();
  readonly head = new Group();
  readonly armL = new Group(); // on the figure's left (+x)
  readonly armR = new Group();
  readonly legL = new Group();
  readonly legR = new Group();
  private phase = Math.random() * 10;
  private geometries: BufferGeometry[] = [];

  constructor(look: Look, material: Material) {
    const shoes = look.shoes ?? "#2f2a28";
    const keep = (k: Kit) => {
      const g = k.build();
      if (g) this.geometries.push(g);
      return g;
    };

    // legs, hinged at the hip
    for (const [leg, side] of [
      [this.legL, 1],
      [this.legR, -1],
    ] as const) {
      const k = new Kit();
      k.add(new CylinderGeometry(0.085, 0.075, 0.72, 8).translate(0, -0.36, 0), look.skirt ? look.skin : look.pants);
      k.box(0.15, 0.09, 0.25, shoes, { y: -0.8, z: 0.04 });
      leg.add(mesh(keep(k), material));
      leg.position.set(side * 0.1, 0.82, 0);
      this.body.add(leg);
    }

    // body
    const k = new Kit();
    if (look.skirt) k.add(new ConeGeometry(0.34, 0.62, 14).translate(0, 0.31, 0), look.pants, { y: 0.32 });
    else k.cyl(0.19, 0.2, 0.18, look.pants, { y: 0.74 }, 12);
    k.cyl(0.19, 0.23, 0.52, look.shirt, { y: 0.86 }, 12);
    k.ball(0.2, look.shirt, { y: 1.35, sy: 0.45 });
    k.cyl(0.06, 0.065, 0.1, look.skin, { y: 1.38 }, 8);
    if (look.apron) {
      k.box(0.34, 0.6, 0.04, "#efe6d2", { y: 0.62, z: 0.21 });
      const spots = ["#d63c62", "#2c56b8", "#f2a516", "#1b8e8e"];
      spots.forEach((c, i) => k.ball(0.035, c, { x: -0.1 + i * 0.07, y: 0.75 + (i % 2) * 0.18, z: 0.235, sz: 0.3 }));
    }
    if (look.bag) {
      k.box(0.3, 0.34, 0.08, look.bag, { x: 0.27, y: 0.62, z: 0.04 });
      k.box(0.04, 0.6, 0.03, look.bag, { x: 0.22, y: 0.92, z: 0.1, rz: 0.45 });
    }
    if (look.backpack) {
      k.box(0.36, 0.42, 0.2, look.backpack, { y: 0.82, z: -0.27 });
      k.box(0.3, 0.14, 0.06, look.backpack, { y: 0.9, z: -0.39 });
    }
    this.body.add(mesh(keep(k), material));

    // arms, hinged at the shoulder
    for (const [arm, side] of [
      [this.armL, 1],
      [this.armR, -1],
    ] as const) {
      const a = new Kit();
      a.add(new CylinderGeometry(0.068, 0.064, 0.24, 8).translate(0, -0.12, 0), look.shirt);
      a.add(new CylinderGeometry(0.05, 0.045, 0.34, 8).translate(0, -0.4, 0), look.skin);
      a.ball(0.06, look.skin, { y: -0.6 });
      if (look.umbrella && side === 1) {
        a.cyl(0.012, 0.012, 1.3, "#3a3530", { y: -0.62, z: 0.06 }, 5);
        a.add(new ConeGeometry(0.75, 0.32, 10, 1, true).translate(0, 0.16, 0), look.umbrella, { y: 0.62, z: 0.06 });
      }
      arm.add(mesh(keep(a), material));
      arm.position.set(side * 0.27, 1.32, 0);
      arm.rotation.z = side * 0.08;
      this.body.add(arm);
    }

    // head, with hair, eyes, rosy cheeks and a hat
    const h = new Kit();
    h.ball(0.21, look.skin, { y: 0.2 }, 16, 12);
    h.add(new SphereGeometry(0.225, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), look.hair, {
      y: 0.21,
      z: -0.02,
      rx: -0.25,
    });
    for (const side of [-1, 1]) {
      h.ball(0.026, "#1d1b2a", { x: side * 0.075, y: 0.22, z: 0.19 }, 8, 6);
      h.ball(0.035, "#f2a0a0", { x: side * 0.12, y: 0.15, z: 0.165, sz: 0.4 }, 8, 6);
    }
    switch (look.hat) {
      case "straw":
        h.cyl(0.42, 0.42, 0.025, look.hatColor ?? "#e3c27a", { y: 0.33 }, 20);
        h.cyl(0.19, 0.22, 0.15, look.hatColor ?? "#e3c27a", { y: 0.34 }, 16);
        h.cyl(0.225, 0.225, 0.04, "#b92a4f", { y: 0.35 }, 16);
        break;
      case "beret":
        h.ball(0.25, look.hatColor ?? "#8c2633", { y: 0.38, x: 0.04, sy: 0.32, rz: -0.25 }, 16, 8);
        h.cyl(0.015, 0.02, 0.06, look.hatColor ?? "#8c2633", { y: 0.44, x: 0.02 }, 5);
        break;
      case "cap":
        h.add(new SphereGeometry(0.23, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), look.hatColor ?? "#2c56b8", { y: 0.25 });
        h.box(0.26, 0.025, 0.2, look.hatColor ?? "#2c56b8", { y: 0.26, z: 0.24 });
        break;
      case "bun":
        h.ball(0.1, look.hair, { y: 0.36, z: -0.14 });
        break;
    }
    this.head.add(mesh(keep(h), material));
    this.head.position.y = 1.4;
    this.body.add(this.head);

    this.root.add(this.body);
    this.root.scale.setScalar(look.scale ?? 1);
  }

  /** Walk cycle for a given speed (m/s); standing still breathes gently. `air` tucks the legs for a jump. */
  animate(dt: number, speed: number, t: number, air = false) {
    const amt = Math.min(speed / 3.5, 1);
    this.phase += dt * (2 + speed * 2.3);
    const s = Math.sin(this.phase) * 0.7 * amt;
    if (air) {
      this.legL.rotation.x = -0.6;
      this.legR.rotation.x = 0.3;
      this.armL.rotation.x = -1.2;
      this.armR.rotation.x = -1.0;
    } else {
      this.legL.rotation.x = s;
      this.legR.rotation.x = -s;
      this.armL.rotation.x = -s * 0.85;
      this.armR.rotation.x = s * 0.85;
    }
    this.body.position.y = Math.abs(Math.cos(this.phase)) * 0.05 * amt + (1 - amt) * Math.sin(t * 2.2) * 0.008;
    this.body.rotation.x = amt * 0.08;
    this.head.rotation.y = (1 - amt) * Math.sin(t * 0.4 + this.phase) * 0.25;
  }

  /** Raises the right hand and waves. */
  wave(t: number) {
    this.armR.rotation.x = 0;
    this.armR.rotation.z = -2.6 + Math.sin(t * 9) * 0.35;
    this.head.rotation.z = Math.sin(t * 3) * 0.08;
  }

  /** Little brushstrokes at an easel. */
  paint(t: number) {
    this.armR.rotation.z = -0.3;
    this.armR.rotation.x = -1.2 + Math.sin(t * 3) * 0.15;
    this.head.rotation.z = Math.sin(t * 0.8) * 0.05;
  }

  /** Puts the arms back after waving or painting. */
  rest() {
    this.armR.rotation.set(0, 0, -0.08);
    this.head.rotation.z = 0;
  }

  dispose() {
    this.geometries.forEach((g) => g.dispose());
  }
}

/** A seeded mix of everyday Ilonggo afternoon looks for the people in the plaza. */
export function crowdLook(rand: { next: () => number; pick: <T>(a: readonly T[]) => T }): Look {
  const skirt = rand.next() < 0.4;
  return {
    skin: rand.pick(["#c68863", "#b97a55", "#d39b74", "#a86c4a", "#e0b08a"]),
    hair: rand.pick(["#1d1b1a", "#2b211c", "#3a2a20", "#5a4636"]),
    shirt: rand.pick([
      "#f4f1ea",
      "#d63c62",
      "#2c56b8",
      "#f2a516",
      "#1b8e8e",
      "#8fd3ef",
      "#f4d78f",
      "#6b4aa6",
      "#e98a7a",
    ]),
    pants: skirt
      ? rand.pick(["#2c56b8", "#d63c62", "#f4d78f", "#3e4a5c"])
      : rand.pick(["#3e4a5c", "#2b2f36", "#6b5a4e", "#c9b79c", "#1a2b52"]),
    skirt,
    hat: rand.pick(["none", "none", "cap", "bun", "straw"] as const),
    hatColor: rand.pick(["#2c56b8", "#d63c62", "#f4f1ea", "#e3c27a"]),
    umbrella: rand.next() < 0.18 ? rand.pick(["#d63c62", "#2c56b8", "#f2a516", "#1b8e8e"]) : undefined,
    bag: rand.next() < 0.3 ? rand.pick(["#b0815a", "#e6ab2e", "#f4f1ea"]) : undefined,
  };
}
