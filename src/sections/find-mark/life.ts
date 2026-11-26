// The life of the plaza: people strolling, sitting on the benches and selling sorbetes and balloons;
// kids at the playground; pigeons by the fountain that scatter when you run at them; butterflies
// over the flowers; swallows wheeling overhead.

import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Material,
} from "three";
import { seeded } from "@/lib/seeded";
import { inside, type Circle, type Obstacles } from "./collide";
import { time } from "./materials";
import { areas, benches, points } from "./molo-map";
import type { Singer } from "./game";
import { Person, crowdLook } from "./people";

/** Wings that flap: vertices with aWing ≠ 0 lift and fall; each instance has its own phase and flap amount. */
function wingMaterial(speed: number, lift: number) {
  const m = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTime;\nattribute float aWing;\nattribute vec2 aFlap;",
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        #include <begin_vertex>
        float beat = sin(uTime * ${speed.toFixed(1)} + aFlap.x);
        transformed.y += abs(aWing) * beat * ${lift.toFixed(2)} * aFlap.y;
      `,
      );
  };
  m.customProgramCacheKey = () => `wings-${speed}-${lift}`;
  return m;
}

function wingedGeometry(body: string, wing: string, span: number, length: number, bodyR: number) {
  const pos: number[] = [];
  const col: number[] = [];
  const wingAttr: number[] = [];
  const cb = new Color(body);
  const cw = new Color(wing);
  const tri = (a: number[], b: number[], c: number[], color: Color, w: number[]) => {
    pos.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) col.push(color.r, color.g, color.b);
    wingAttr.push(...w);
  };
  // body: a little diamond
  const f = [0, 0, length / 2];
  const b = [0, 0, -length / 2];
  const u = [0, bodyR, 0];
  const d = [0, -bodyR, 0];
  const l = [-bodyR, 0, 0];
  const r = [bodyR, 0, 0];
  for (const [p, q] of [
    [u, l],
    [l, d],
    [d, r],
    [r, u],
  ]) {
    tri(f, p, q, cb, [0, 0, 0]);
    tri(b, q, p, cb, [0, 0, 0]);
  }
  // wings: tips flap
  for (const side of [-1, 1]) {
    tri([0, 0, length * 0.25], [side * span, 0, -length * 0.05], [0, 0, -length * 0.2], cw, [0, side, 0]);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.setAttribute("aWing", new Float32BufferAttribute(wingAttr, 1));
  g.computeVertexNormals();
  return g;
}

type Walker = {
  person: Person;
  x: number;
  z: number;
  tx: number;
  tz: number;
  wait: number;
  speed: number;
  stuck: number;
  heading: number;
  region: number[];
};
type Pigeon = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  mode: 0 | 1 | 2;
  timer: number;
  heading: number;
  tx: number;
  tz: number;
  peck: number;
};

const m4 = new Matrix4();
const q = new Quaternion();
const v = new Vector3();
const one = new Vector3(1, 1, 1);
const up = new Vector3(0, 1, 0);

export class Life {
  readonly group = new Group();
  /** the faithful praying in St. Anne's pews, in church-local metres: Walk adds this to the interior */
  readonly worshippers = new Group();
  private walkers: Walker[] = [];
  private still: {
    person: Person;
    mode: "stand" | "sit" | "kid" | "eat" | "pray";
    cx: number;
    cz: number;
    phase: number;
  }[] = [];
  private pigeons: Pigeon[] = [];
  private pigeonMesh: InstancedMesh;
  private birds: InstancedMesh;
  private butterflies: InstancedMesh;
  private butterflyHomes: { x: number; z: number; a: number; b: number }[] = [];
  private balloons: Group;
  private flockCentres = [new Vector3(-20, 34, -10), new Vector3(60, 42, 40), new Vector3(-90, 30, 60)];
  private rand = seeded(311);
  private colliders: Circle[] = [];
  private fountain: { x: number; z: number };
  /** the two who know Dandansoy (the band quest): the sorbetes man and the guard at the mansion gate */
  readonly singers: Record<Singer, Person>;
  /** who's singing to you, until when (seconds), and the way they turned from */
  private singing = new Map<Singer, { until: number; facing: number }>();

  constructor(
    material: Material,
    private obstacles: Obstacles,
    opts: {
      lite: boolean;
      fountain: { x: number; z: number };
      cart: { x: number; z: number };
      balloons: [number, number];
      gate: { x: number; z: number; facing: number };
      /** stools at Jollibee's outdoor tables, each facing its table */
      diners: { x: number; z: number; ry: number }[];
      /** seats in the church's pews (church-local), and the interior's material so they're lit alike */
      worship: { seats: { x: number; y: number; z: number }[]; material: Material };
    },
  ) {
    const rand = this.rand;
    this.fountain = opts.fountain;
    const plaza = areas.find((a) => a.kind === "plaza")?.points ?? [];

    // people strolling about the plaza
    const count = opts.lite ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const person = new Person(crowdLook(rand), material);
      const [x, z] = this.randomIn(plaza);
      this.walkers.push({
        person,
        x,
        z,
        tx: x,
        tz: z,
        wait: rand.range(0, 4),
        speed: rand.range(1.0, 1.5),
        stuck: 0,
        heading: rand.range(0, 6.28),
        region: plaza,
      });
      this.group.add(person.root);
    }

    // the sorbetes man by his cart, the balloon seller, a guard at the mansion gate
    const vendor = new Person(
      { skin: "#b97a55", hair: "#1d1b1a", shirt: "#f4f1ea", pants: "#3e4a5c", hat: "cap", hatColor: "#d63c62" },
      material,
    );
    vendor.root.position.set(opts.cart.x + 1.1, 0, opts.cart.z + 0.6);
    vendor.root.rotation.y = Math.atan2(opts.fountain.x - opts.cart.x, opts.fountain.z - opts.cart.z);
    this.still.push({ person: vendor, mode: "stand", cx: 0, cz: 0, phase: 0 });
    this.obstacles.addCircle(vendor.root.position.x, vendor.root.position.z, 0.35, 1.7);

    const seller = new Person(
      { skin: "#c68863", hair: "#2b211c", shirt: "#f2a516", pants: "#2c56b8", skirt: true, hat: "straw" },
      material,
    );
    seller.root.position.set(opts.balloons[0], 0, opts.balloons[1]);
    this.still.push({ person: seller, mode: "stand", cx: 0, cz: 0, phase: 1 });
    this.obstacles.addCircle(opts.balloons[0], opts.balloons[1], 0.35, 1.7);
    this.balloons = new Group();
    const colours = ["#d63c62", "#2c56b8", "#f2a516", "#1b8e8e", "#6b4aa6", "#f4d78f", "#e98a7a"];
    const strings: number[] = [];
    for (let b = 0; b < 9; b++) {
      const a = b * 2.4;
      const r = 0.2 + (b % 3) * 0.16;
      const top = new Vector3(Math.sin(a) * r, 2.7 + (b % 4) * 0.22, Math.cos(a) * r);
      const ball = new Mesh(
        new SphereGeometry(0.2, 12, 10).scale(1, 1.18, 1),
        new MeshLambertMaterial({
          color: colours[b % colours.length],
          emissive: colours[b % colours.length],
          emissiveIntensity: 0.15,
        }),
      );
      ball.position.copy(top);
      this.balloons.add(ball);
      strings.push(0.35, 1.3, 0.1, top.x, top.y - 0.22, top.z);
    }
    const lineGeo = new BufferGeometry();
    lineGeo.setAttribute("position", new Float32BufferAttribute(strings, 3));
    this.balloons.add(new LineSegments(lineGeo, new LineBasicMaterial({ color: "#efefef" })));
    this.balloons.position.set(opts.balloons[0], 0, opts.balloons[1]);
    this.group.add(this.balloons);

    const guard = new Person(
      { skin: "#a86c4a", hair: "#1d1b1a", shirt: "#3b5b8f", pants: "#1a2b52", hat: "cap", hatColor: "#1a2b52" },
      material,
    );
    guard.root.position.set(opts.gate.x, 0, opts.gate.z);
    guard.root.rotation.y = opts.gate.facing;
    this.still.push({ person: guard, mode: "stand", cx: 0, cz: 0, phase: 2 });
    this.obstacles.addCircle(opts.gate.x, opts.gate.z, 0.35, 1.7);
    this.singers = { sorbetes: vendor, guard };

    // folk resting on the benches round the flagpole
    const pole = points.find((p) => p.kind === "flagpole")?.at ?? [0, 0];
    for (let i = 0; i < Math.min(benches.length, 24); i += 6) {
      const bx = benches[i];
      const bz = benches[i + 1];
      const p = new Person(crowdLook(rand), material);
      const facing = Math.atan2(pole[0] - bx, pole[1] - bz);
      p.root.position.set(bx - Math.sin(facing) * 0.05, -0.36, bz - Math.cos(facing) * 0.05);
      p.root.rotation.y = facing;
      p.legL.rotation.x = p.legR.rotation.x = -1.35;
      this.still.push({ person: p, mode: "sit", cx: 0, cz: 0, phase: i });
    }

    // folk at Jollibee's outdoor tables, tucking into a burger or a fry (and the odd empty stool)
    opts.diners.forEach((d, i) => {
      if (opts.lite && i % 2 === 1) return; // fewer on slow devices
      if (i % 5 === 3) return; // an empty stool here and there
      const p = new Person({ ...crowdLook(rand), umbrella: undefined, backpack: undefined }, material);
      p.root.position.set(d.x, -0.36, d.z);
      p.root.rotation.y = d.ry;
      p.legL.rotation.x = p.legR.rotation.x = -1.3;
      p.hold(i % 2 ? "fries" : "burger", material);
      this.obstacles.addCircle(d.x, d.z, 0.35, 1.3);
      this.still.push({ person: p, mode: "eat", cx: 0, cz: 0, phase: i * 2.3 });
    });

    // kids racing round the playgrounds
    for (const a of areas.filter((g) => g.kind === "playground")) {
      const [cx, cz] = this.centreOf(a.points);
      for (let i = 0; i < (opts.lite ? 1 : 2); i++) {
        const kid = new Person({ ...crowdLook(rand), scale: 0.62, umbrella: undefined, bag: undefined }, material);
        this.still.push({ person: kid, mode: "kid", cx, cz, phase: i * Math.PI });
      }
    }
    this.still.forEach((s) => this.group.add(s.person.root));

    // the faithful, praying in the pews of St. Anne's, facing the altar (local -z)
    opts.worship.seats.forEach((seat, i) => {
      if (opts.lite && i % 2 === 1) return;
      const look = crowdLook(rand);
      const p = new Person(
        { ...look, umbrella: undefined, backpack: undefined, hat: look.hat === "bun" ? "bun" : "none" },
        opts.worship.material,
      );
      p.root.position.set(seat.x, seat.y, seat.z);
      p.root.rotation.y = Math.PI;
      p.legL.rotation.x = p.legR.rotation.x = -1.4;
      this.still.push({ person: p, mode: "pray", cx: 0, cz: 0, phase: i * 1.7 });
      this.worshippers.add(p.root);
    });

    // pigeons
    const pigeonGeo = wingedGeometry("#8d95a3", "#a7aebb", 0.32, 0.36, 0.08);
    const pigeonCount = opts.lite ? 10 : 18;
    this.pigeonMesh = new InstancedMesh(pigeonGeo, wingMaterial(22, 0.18), pigeonCount);
    this.pigeonMesh.geometry.setAttribute("aFlap", new InstancedBufferAttribute(new Float32Array(pigeonCount * 2), 2));
    for (let i = 0; i < pigeonCount; i++) {
      const [x, z] = this.pigeonSpot();
      this.pigeons.push({
        x,
        y: 0.1,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        mode: 0,
        timer: 0,
        heading: rand.range(0, 6.28),
        tx: x,
        tz: z,
        peck: rand.range(0, 6),
      });
    }
    this.pigeonMesh.castShadow = true;
    this.pigeonMesh.frustumCulled = false;
    this.group.add(this.pigeonMesh);

    // swallows overhead
    const birdCount = opts.lite ? 12 : 21;
    this.birds = new InstancedMesh(
      wingedGeometry("#2b2d36", "#3a3d48", 0.55, 0.4, 0.07),
      wingMaterial(14, 0.35),
      birdCount,
    );
    const flap = new Float32Array(birdCount * 2);
    for (let i = 0; i < birdCount; i++) {
      flap[i * 2] = i * 1.7;
      flap[i * 2 + 1] = 1;
    }
    this.birds.geometry.setAttribute("aFlap", new InstancedBufferAttribute(flap, 2));
    this.birds.frustumCulled = false;
    this.group.add(this.birds);

    // butterflies over the gardens and lawns
    const homes = areas.filter((a) => a.kind === "garden" || a.kind === "grass").slice(0, 8);
    const bfCount = opts.lite ? 8 : 16;
    this.butterflies = new InstancedMesh(
      wingedGeometry("#2b2d36", "#ffffff", 0.09, 0.05, 0.012),
      wingMaterial(30, 1.6),
      bfCount,
    );
    const bflap = new Float32Array(bfCount * 2);
    const tints = ["#f7d35a", "#ffffff", "#ff9a3c", "#8fd3ef", "#f08bb0"];
    for (let i = 0; i < bfCount; i++) {
      const home = homes[i % homes.length];
      const [x, z] = home ? this.randomIn(home.points) : [0, 0];
      this.butterflyHomes.push({ x, z, a: rand.range(0.3, 0.8), b: rand.range(0.4, 1.1) });
      bflap[i * 2] = i * 2.1;
      bflap[i * 2 + 1] = 1;
      this.butterflies.setColorAt(i, new Color(tints[i % tints.length]));
    }
    this.butterflies.geometry.setAttribute("aFlap", new InstancedBufferAttribute(bflap, 2));
    this.butterflies.frustumCulled = false;
    this.group.add(this.butterflies);
  }

  private centreOf(pts: number[]): [number, number] {
    let x = 0;
    let z = 0;
    for (let i = 0; i < pts.length; i += 2) {
      x += pts[i];
      z += pts[i + 1];
    }
    return [(x * 2) / pts.length, (z * 2) / pts.length];
  }

  private randomIn(pts: number[]): [number, number] {
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
    for (let i = 0; i < 60; i++) {
      const x = this.rand.range(x0, x1);
      const z = this.rand.range(z0, z1);
      if (inside(pts, x, z)) return [x, z];
    }
    return this.centreOf(pts);
  }

  private pigeonSpot(): [number, number] {
    const a = this.rand.range(0, Math.PI * 2);
    const r = this.rand.range(5.2, 11);
    return [this.fountain.x + Math.cos(a) * r, this.fountain.z + Math.sin(a) * r];
  }

  /** Moving people, as circles the visitor bumps into. */
  people() {
    this.colliders.length = 0;
    for (const w of this.walkers) this.colliders.push({ x: w.x, z: w.z, r: 0.35, h: 1.7 });
    return this.colliders;
  }

  /** One of the singers turns to you and sings (sways and waves along) until `until` seconds. */
  sing(who: Singer, until: number) {
    const p = this.singers[who];
    const was = this.singing.get(who)?.facing ?? p.root.rotation.y;
    this.singing.set(who, { until, facing: was });
  }

  update(dt: number, t: number, player: { x: number; z: number; speed: number; reducedMotion?: boolean }) {
    // strollers
    for (const w of this.walkers) {
      const dx = w.tx - w.x;
      const dz = w.tz - w.z;
      const d = Math.hypot(dx, dz);
      let speed = 0;
      if (w.wait > 0) {
        w.wait -= dt;
      } else if (d < 0.5 || w.stuck > 2.5) {
        [w.tx, w.tz] = this.randomIn(w.region);
        w.wait = this.rand.range(1, 6);
        w.stuck = 0;
      } else {
        speed = w.speed;
        const px = w.x;
        const pz = w.z;
        w.x += (dx / d) * speed * dt;
        w.z += (dz / d) * speed * dt;
        const p = { x: w.x, z: w.z };
        this.obstacles.resolve(p, 0.35, [{ x: player.x, z: player.z, r: 0.35, h: 2 }]);
        w.x = p.x;
        w.z = p.z;
        const moved = Math.hypot(w.x - px, w.z - pz);
        w.stuck = moved < speed * dt * 0.3 ? w.stuck + dt : Math.max(0, w.stuck - dt);
        const want = Math.atan2(dx, dz);
        let turn = want - w.heading;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        w.heading += turn * Math.min(dt * 6, 1);
      }
      w.person.root.position.set(w.x, 0, w.z);
      w.person.root.rotation.y = w.heading;
      w.person.animate(dt, speed, t);
    }

    for (const s of this.still) {
      if (s.mode === "kid") {
        const a = t * 0.9 + s.phase;
        const x = s.cx + Math.cos(a) * 3.2;
        const z = s.cz + Math.sin(a) * 3.2;
        s.person.root.position.set(x, 0, z);
        s.person.root.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
        s.person.animate(dt, 3, t);
      } else if (s.mode === "pray") {
        s.person.pray(t, s.phase);
      } else if (s.mode === "eat") {
        s.person.eat(t, s.phase);
      } else if (s.mode === "stand") {
        s.person.animate(dt, 0, t + s.phase);
      }
    }
    // singing you their half of Dandansoy: facing you, swaying and waving along, then back as they were
    for (const [who, s] of this.singing) {
      const p = this.singers[who];
      const sing = t < s.until;
      const want = sing ? Math.atan2(player.x - p.root.position.x, player.z - p.root.position.z) : s.facing;
      const d = Math.atan2(Math.sin(want - p.root.rotation.y), Math.cos(want - p.root.rotation.y));
      p.root.rotation.y += d * Math.min(dt * 5, 1);
      if (sing && !player.reducedMotion) {
        p.wave(t * 0.5);
        p.body.rotation.z = Math.sin(t * 3.4) * 0.06;
      } else {
        p.rest();
        p.body.rotation.z = 0;
        if (!sing && Math.abs(d) < 0.01) this.singing.delete(who);
      }
    }
    this.balloons.children.forEach((b, i) => {
      if (b instanceof Mesh) b.position.x += Math.sin(t * 1.3 + i) * 0.0015;
    });
    this.balloons.rotation.y = Math.sin(t * 0.4) * 0.15;

    this.updatePigeons(dt, t, player);
    this.updateBirds(t);
    this.updateButterflies(t);
  }

  private updatePigeons(dt: number, t: number, player: { x: number; z: number; speed: number }) {
    const flap = this.pigeonMesh.geometry.getAttribute("aFlap") as InstancedBufferAttribute;
    this.pigeons.forEach((p, i) => {
      const dx = p.x - player.x;
      const dz = p.z - player.z;
      const near = Math.hypot(dx, dz);
      if (p.mode === 0) {
        // pecking about; startled if you come close
        if (near < (player.speed > 3 ? 4.5 : 2.6)) {
          p.mode = 1;
          p.timer = this.rand.range(5, 9);
          const l = near || 1;
          p.vx = (dx / l) * 4;
          p.vz = (dz / l) * 4;
          p.vy = 5;
        } else {
          p.peck += dt;
          if (Math.hypot(p.tx - p.x, p.tz - p.z) < 0.1) {
            if (this.rand.next() < dt * 0.4) {
              p.tx = p.x + this.rand.range(-1.2, 1.2);
              p.tz = p.z + this.rand.range(-1.2, 1.2);
            }
          } else {
            const ax = p.tx - p.x;
            const az = p.tz - p.z;
            const l = Math.hypot(ax, az);
            p.x += (ax / l) * Math.min(dt * 0.6, l);
            p.z += (az / l) * Math.min(dt * 0.6, l);
            p.heading = Math.atan2(ax, az);
          }
          p.y = 0.1;
        }
      } else if (p.mode === 1) {
        // up and round the fountain
        p.timer -= dt;
        const cx = this.fountain.x + Math.cos(t * 0.6 + i) * 9;
        const cz = this.fountain.z + Math.sin(t * 0.6 + i) * 9;
        p.vx += (cx - p.x) * dt * 0.8;
        p.vz += (cz - p.z) * dt * 0.8;
        p.vy += (8 + (i % 4) - p.y) * dt * 0.9;
        const damp = Math.pow(0.6, dt);
        p.vx *= damp;
        p.vz *= damp;
        p.vy *= damp;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.heading = Math.atan2(p.vx, p.vz);
        if (p.timer <= 0) {
          p.mode = 2;
          [p.tx, p.tz] = this.pigeonSpot();
        }
      } else {
        // gliding back down to a fresh spot
        const ax = p.tx - p.x;
        const az = p.tz - p.z;
        const l = Math.hypot(ax, az);
        const step = Math.min(dt * 4, l);
        if (l > 0.05) {
          p.x += (ax / l) * step;
          p.z += (az / l) * step;
          p.heading = Math.atan2(ax, az);
        }
        p.y = Math.max(0.1, p.y - dt * Math.max(1.5, p.y * 0.8));
        if (p.y <= 0.11 && l < 0.2) p.mode = 0;
      }
      const bob = p.mode === 0 ? Math.max(0, Math.sin(p.peck * 5 + i)) * 0.5 : 0;
      q.setFromAxisAngle(up, p.heading);
      const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), bob);
      q.multiply(tilt);
      m4.compose(v.set(p.x, p.y, p.z), q, one);
      this.pigeonMesh.setMatrixAt(i, m4);
      flap.setXY(i, i * 1.3, p.mode === 0 ? 0 : 1);
    });
    flap.needsUpdate = true;
    this.pigeonMesh.instanceMatrix.needsUpdate = true;
  }

  private updateBirds(t: number) {
    const n = this.birds.count;
    for (let i = 0; i < n; i++) {
      const flock = this.flockCentres[i % this.flockCentres.length];
      const k = Math.floor(i / this.flockCentres.length);
      const speed = 0.12 + (i % 3) * 0.01;
      const a = t * speed + k * 0.12 + (i % 3) * 2;
      const r = 26 + k * 1.6;
      const x = flock.x + Math.cos(a) * r;
      const z = flock.z + Math.sin(a) * r;
      const y = flock.y + Math.sin(t * 0.5 + k) * 2 + k * 0.6;
      q.setFromAxisAngle(up, Math.atan2(-Math.sin(a), Math.cos(a)));
      m4.compose(v.set(x, y, z), q, one);
      this.birds.setMatrixAt(i, m4);
    }
    this.birds.instanceMatrix.needsUpdate = true;
  }

  private updateButterflies(t: number) {
    this.butterflyHomes.forEach((h, i) => {
      const x = h.x + Math.sin(t * h.a + i) * 1.8 + Math.sin(t * 2.3 + i * 3) * 0.25;
      const z = h.z + Math.cos(t * h.b + i * 2) * 1.8;
      const y = 0.8 + Math.sin(t * 1.7 + i) * 0.35 + Math.sin(t * 5 + i) * 0.08;
      q.setFromAxisAngle(up, t * h.a + i);
      m4.compose(v.set(x, y, z), q, one);
      this.butterflies.setMatrixAt(i, m4);
    });
    this.butterflies.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    [...this.walkers.map((w) => w.person), ...this.still.map((s) => s.person)].forEach((p) => p.dispose());
    this.pigeonMesh.geometry.dispose();
    this.birds.geometry.dispose();
    this.butterflies.geometry.dispose();
    this.balloons.traverse((o) => {
      if (o instanceof Mesh || o instanceof LineSegments) {
        o.geometry.dispose();
        (o.material as Material).dispose();
      }
    });
  }
}
