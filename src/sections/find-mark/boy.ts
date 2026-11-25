// You: a boy in a straw hat, a pink T-shirt, navy shorts and sneakers, with a yellow backpack. He's
// built in more detail than the townsfolk, with a big round cartoon face (see people.ts): two-part arms and legs, so his knees and
// elbows bend; hands; a face with ears, a nose, eyebrows, a smile and eyes that blink. His walk has a
// proper stride (knees lifting, arms swinging, hips bobbing and rolling, shoulders twisting against the
// legs), he leans into a run, tucks up when he jumps, and when he stands still he breathes, shifts his
// weight, blinks and looks about. Facing +z, feet at y = 0, about 1.75 m tall in the hat.

import {
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  TorusGeometry,
  type Material,
  type Object3D,
} from "three";
import { Kit } from "./kit";

const SKIN = "#dca37a"; // a warm, light tan
const HAIR = "#5b3418";
const BROW = "#3e2312";
const FACE = SKIN;
const BLUSH = "#ef9a8e";
const SHIRT = "#d63c62";
const SHORTS = "#1a2b52";
const STRAW = "#e3c27a";
const BAND = "#b92a4f";
const PACK = "#f2a516";
const SHOE = "#f4f1ea";

const HIP_Y = 0.86;
const THIGH = 0.42;
const SHIN = 0.4;
const UPPER = 0.27;
const FORE = 0.25;

export class Boy {
  readonly root = new Group();
  private hips = new Group();
  private torso = new Group();
  private chest = new Group();
  private head = new Group();
  private eyes = new Group();
  private pack = new Group();
  private thigh = [new Group(), new Group()]; // [left (+x), right]
  private knee = [new Group(), new Group()];
  private foot = [new Group(), new Group()];
  private shoulder = [new Group(), new Group()];
  private elbow = [new Group(), new Group()];
  private geometries: BufferGeometry[] = [];
  private phase = 0;
  private stride = 0; // eases between standing and walking
  private run = 0;
  private air = 0;
  private blink = 2;
  private look = { now: 0, want: 0, wait: 2 };
  /** something held in both hands in front of him (a bowl of pancit), and how far his arms are up for it */
  private carrying: Object3D | null = null;
  private hold = 0;

  constructor(material: Material) {
    const mesh = (k: Kit, parent: Group) => {
      const g = k.build();
      if (!g) return;
      this.geometries.push(g);
      const m = new Mesh(g, material);
      m.castShadow = true;
      parent.add(m);
    };

    this.root.add(this.hips);
    this.hips.position.y = HIP_Y;

    // ---- legs: thigh (in the shorts), knee, shin, ankle sock, sneaker -----------------------------
    for (const i of [0, 1]) {
      const side = i === 0 ? 1 : -1;
      const thigh = this.thigh[i];
      thigh.position.set(side * 0.1, 0, 0);
      this.hips.add(thigh);
      const t = new Kit();
      t.add(new CylinderGeometry(0.1, 0.095, 0.24, 10).translate(0, -0.12, 0), SHORTS); // the shorts leg
      t.add(new CylinderGeometry(0.078, 0.07, THIGH - 0.2, 10).translate(0, -0.2 - (THIGH - 0.2) / 2, 0), SKIN);
      t.ball(0.072, SKIN, { y: -THIGH }, 10, 8); // the knee
      mesh(t, thigh);

      const knee = this.knee[i];
      knee.position.y = -THIGH;
      thigh.add(knee);
      const s = new Kit();
      s.add(new CylinderGeometry(0.068, 0.055, SHIN - 0.08, 10).translate(0, -(SHIN - 0.08) / 2, 0), SKIN);
      s.add(new CylinderGeometry(0.058, 0.058, 0.08, 10).translate(0, -SHIN + 0.04, 0), "#f7f4ee"); // sock
      mesh(s, knee);

      const foot = this.foot[i];
      foot.position.y = -SHIN;
      knee.add(foot);
      const f = new Kit();
      f.box(0.13, 0.08, 0.26, SHOE, { y: -0.075, z: 0.05 });
      f.ball(0.066, SHOE, { y: -0.035, z: 0.17, sy: 0.65 }, 10, 6); // rounded toe
      f.box(0.135, 0.025, 0.27, "#c8102e", { y: -0.085, z: 0.05 }); // red sole
      f.box(0.1, 0.01, 0.12, "#c8102e", { y: 0.006, z: 0.07 }); // laces
      mesh(f, foot);
    }

    // ---- torso: shorts' waist, T-shirt, shoulders, neck ----------------------------------------------
    this.hips.add(this.torso);
    const w = new Kit();
    w.cyl(0.2, 0.2, 0.14, SHORTS, { y: -0.08 }, 14);
    mesh(w, this.hips);
    this.torso.add(this.chest);
    const c = new Kit();
    c.cyl(0.21, 0.19, 0.44, SHIRT, { y: 0.04 }, 14);
    c.ball(0.215, SHIRT, { y: 0.47, sy: 0.4 }, 14, 8); // shoulders
    c.cyl(0.215, 0.215, 0.03, "#b8304f", { y: 0.04 }, 14); // hem
    c.cyl(0.06, 0.065, 0.12, SKIN, { y: 0.5 }, 10); // neck
    c.add(new CylinderGeometry(0.08, 0.08, 0.02, 12), "#b8304f", { y: 0.53 }); // collar
    mesh(c, this.chest);

    // the backpack, with its straps over the shoulders
    this.pack.position.set(0, 0.3, -0.19);
    this.chest.add(this.pack);
    const p = new Kit();
    p.box(0.34, 0.4, 0.17, PACK, { y: -0.2, z: -0.08 });
    p.box(0.26, 0.16, 0.06, "#e08f0c", { y: -0.3, z: -0.18 }); // front pocket
    p.ball(0.17, PACK, { y: 0.2, z: -0.08, sy: 0.35, sz: 0.5 }, 12, 6); // rounded top
    mesh(p, this.pack);
    const straps = new Kit();
    for (const sx of [-0.11, 0.11]) {
      straps.box(0.045, 0.42, 0.02, "#e08f0c", { x: sx, y: 0.08, z: 0.205, rx: -0.05 });
      straps.box(0.045, 0.02, 0.36, "#e08f0c", { x: sx, y: 0.49, z: 0.01 });
    }
    mesh(straps, this.chest);

    // ---- arms: short sleeve, upper arm, elbow, forearm, hand -----------------------------------------
    for (const i of [0, 1]) {
      const side = i === 0 ? 1 : -1;
      const sh = this.shoulder[i];
      sh.position.set(side * 0.25, 0.45, 0);
      sh.rotation.z = side * 0.1;
      this.chest.add(sh);
      const u = new Kit();
      u.add(new CylinderGeometry(0.075, 0.07, 0.14, 10).translate(0, -0.06, 0), SHIRT); // sleeve
      u.add(new CylinderGeometry(0.052, 0.048, UPPER - 0.1, 8).translate(0, -0.1 - (UPPER - 0.1) / 2, 0), SKIN);
      u.ball(0.048, SKIN, { y: -UPPER }, 8, 6);
      mesh(u, sh);
      const el = this.elbow[i];
      el.position.y = -UPPER;
      sh.add(el);
      const f = new Kit();
      f.add(new CylinderGeometry(0.046, 0.04, FORE, 8).translate(0, -FORE / 2, 0), SKIN);
      f.ball(0.055, SKIN, { y: -FORE - 0.04, sx: 0.8, sy: 1.1, sz: 0.9 }, 10, 8); // hand
      f.ball(0.022, SKIN, { x: side * -0.035, y: -FORE - 0.02, z: 0.03 }, 6, 4); // thumb
      mesh(f, el);
    }

    // ---- head: a round cartoon face (big shining eyes, soft brows, a little nose, rosy cheeks and an
    // open smile), soft fluffy bangs, and the straw hat tipped back so you can see it all ----------------
    this.head.position.y = 0.58;
    this.chest.add(this.head);
    const H = 0.2; // the middle of the head, above the neck
    const R = 0.24;
    // how far forward the face is at (x, y) from the middle of the head, and the turn that faces a feature
    // straight out from it there
    const front = (x: number, y: number) => Math.sqrt(Math.max(R * R - x * x - y * y, 0));
    const turn = (x: number) => Math.asin(x / R);
    const tilt = (y: number) => -Math.asin(y / R);

    const h = new Kit();
    h.ball(R, FACE, { y: H }, 24, 18);
    for (const sx of [-1, 1]) {
      h.ball(0.055, FACE, { x: sx * 0.235, y: H - 0.01, sx: 0.45 }, 10, 8); // ears
      h.ball(0.024, "#c98a66", { x: sx * 0.255, y: H - 0.01, z: 0.008, sx: 0.4 }, 6, 4);
      // blush
      const cx = sx * 0.135;
      const cy = -0.055;
      h.ball(
        0.04,
        BLUSH,
        { x: cx, y: H + cy, z: front(cx, cy) - 0.006, ry: turn(cx), rx: tilt(cy), sx: 1.35, sz: 0.22 },
        12,
        8,
      );
      // a softly arched eyebrow
      const bx = sx * 0.088;
      const by = 0.118;
      const brow = new Kit();
      brow.add(new TorusGeometry(0.046, 0.0105, 6, 14, Math.PI * 0.6), BROW, { y: -0.04, rz: Math.PI * 0.2 });
      h.merge(brow, { x: bx, y: H + by, z: front(bx, by) + 0.002, ry: turn(bx), rx: tilt(by) });
    }
    // a small nose
    h.ball(0.022, "#d9946c", { y: H - 0.028, z: front(0, -0.028) - 0.004, sx: 1.2, sz: 0.75 }, 10, 8);

    // the smile: a D-shaped open mouth (flat on top), top teeth, a pink tongue — built facing +z, then
    // laid on the face below the nose
    const m = new Kit();
    m.add(
      new CylinderGeometry(0.058, 0.058, 0.01, 22, 1, false, -Math.PI / 2, Math.PI)
        .rotateX(Math.PI / 2)
        .scale(1, 0.8, 1),
      "#6a1d27",
    );
    m.box(0.074, 0.016, 0.006, "#ffffff", { y: -0.019, z: 0.004 });
    m.ball(0.026, "#e46f7d", { y: -0.036, z: 0.004, sx: 1.3, sy: 0.55, sz: 0.3 }, 10, 6);
    const my = -0.075;
    h.merge(m, { y: H + my, z: front(0, my) - 0.002, rx: tilt(my) });

    // hair: a soft cap swept back over the crown, fluffy bangs across the brow, tufts over the ears and
    // at the nape
    h.add(new SphereGeometry(R + 0.018, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), HAIR, {
      y: H + 0.005,
      z: -0.03,
      rx: -0.42,
    });
    const lock = (x: number, y: number, z: number, rz: number, ry = 0, s = 1) =>
      h.ball(0.075 * s, HAIR, { x, y, z, rz, ry, rx: -0.5, sx: 0.62, sy: 0.38, sz: 0.55 }, 12, 8);
    // bangs: overlapping locks sweeping to one side
    [-0.15, -0.09, -0.03, 0.03, 0.09, 0.15].forEach((x, k) =>
      lock(x, H + 0.155 - Math.abs(x) * 0.25, front(x, 0.155) - 0.02, -0.45 + k * 0.04, turn(x), 1 - Math.abs(x) * 0.8),
    );
    for (const sx of [-1, 1]) {
      lock(sx * 0.2, H + 0.08, 0.1, sx * 0.9, sx * 0.9);
      lock(sx * 0.215, H + 0.02, 0.01, sx * 1.2, sx * 1.4, 0.95);
      lock(sx * 0.13, H + 0.0, -0.19, sx * 0.3, sx * 2.6);
    }
    lock(0, H - 0.02, -0.215, 0, Math.PI, 1.1);
    mesh(h, this.head);

    // the straw hat, tipped back on all that hair, with a red band
    const hat = new Kit();
    hat.cyl(0.44, 0.46, 0.03, STRAW, {}, 28);
    hat.cyl(0.215, 0.24, 0.15, STRAW, { y: 0.01 }, 22);
    hat.cyl(0.242, 0.242, 0.045, BAND, { y: 0.02 }, 22);
    hat.cyl(0.215, 0.215, 0.01, "#d4b066", { y: 0.16 }, 22);
    const hatK = new Kit();
    hatK.merge(hat, { y: H + 0.19, z: -0.045, rx: -0.32 });
    mesh(hatK, this.head);

    // the eyes (their own group, so they can blink): an oval white, a big brown iris with a darker rim and
    // a black pupil, two glints, and a lash line over the top — each set into the curve of the face
    const ey = 0.025;
    this.eyes.position.set(0, H + ey, 0);
    this.head.add(this.eyes);
    const e = new Kit();
    for (const sx of [-1, 1]) {
      const x = sx * 0.085;
      const z = front(x, ey);
      const eye = new Kit();
      eye.ball(0.052, "#ffffff", { sx: 0.88, sy: 1.08, sz: 0.3 }, 16, 12);
      eye.ball(0.042, "#3b2414", { y: -0.004, z: 0.006, sx: 0.92, sy: 1.02, sz: 0.3 }, 16, 12);
      eye.ball(0.036, "#6e4425", { y: -0.006, z: 0.009, sx: 0.92, sy: 1.0, sz: 0.3 }, 14, 10);
      eye.ball(0.021, "#0d0907", { y: -0.006, z: 0.013, sz: 0.3 }, 12, 8);
      eye.ball(0.013, "#ffffff", { x: 0.013, y: 0.014, z: 0.017, sz: 0.4 }, 8, 6);
      eye.ball(0.0065, "#ffffff", { x: -0.012, y: -0.02, z: 0.016, sz: 0.4 }, 6, 4);
      eye.add(new TorusGeometry(0.05, 0.007, 6, 18, Math.PI * 0.8), "#24150c", {
        y: 0.004,
        z: 0.008,
        rz: Math.PI * 0.1,
        sx: 0.92,
        sy: 1.12,
      });
      e.merge(eye, { x, z: z - 0.006, ry: turn(x), rx: tilt(ey) });
    }
    mesh(e, this.eyes);
  }

  /** The whole body for this frame: `speed` in m/s, `air` while jumping or falling. */
  animate(dt: number, speed: number, t: number, air = false) {
    const ease = (v: number, to: number, k: number) => v + (to - v) * Math.min(dt * k, 1);
    this.stride = ease(this.stride, Math.min(speed / 2.5, 1), 8);
    this.run = ease(this.run, Math.max(0, Math.min((speed - 3) / 2.5, 1)), 5);
    this.air = ease(this.air, air ? 1 : 0, 12);
    const a = this.stride;
    const r = this.run;
    // steps come quicker as he speeds up, and longer when he runs
    this.phase += dt * (speed > 0.15 ? 3.2 + speed * 1.7 : 0);
    const p = this.phase;
    const reach = (0.5 + r * 0.35) * a;
    this.hold = ease(this.hold, this.carrying ? 1 : 0, 8);

    for (const i of [0, 1]) {
      const q = p + (i === 0 ? 0 : Math.PI); // the legs half a step apart
      const swing = Math.sin(q); // + = this leg back
      // the knee lifts as the leg swings through, and gives a little as the foot lands
      const lift = Math.max(0, Math.cos(q)) * (0.9 + r * 0.8);
      const land = Math.max(0, -Math.cos(q)) * 0.15;
      let thigh = swing * reach - lift * a * 0.35;
      let knee = (lift + land) * a + 0.04;
      let foot = -knee * 0.35 + swing * 0.2 * a;
      // standing: weight on one leg, the other a little bent
      thigh += (1 - a) * (i === 0 ? -0.04 : 0.06) * (1 + Math.sin(t * 0.3));
      knee += (1 - a) * (i === 0 ? 0.02 : 0.1);
      // in the air: legs tucked, one forward
      thigh = thigh * (1 - this.air) + this.air * (i === 0 ? -0.9 : -0.3);
      knee = knee * (1 - this.air) + this.air * (i === 0 ? 1.4 : 0.9);
      foot = foot * (1 - this.air) + this.air * -0.3;
      this.thigh[i].rotation.x = thigh;
      this.knee[i].rotation.x = knee;
      this.foot[i].rotation.x = foot;

      // arms swing against the legs, elbows bending more as he runs
      const arm = -swing * (0.45 + r * 0.45) * a;
      const side = i === 0 ? 1 : -1;
      let sx = arm;
      let el = -(0.2 + a * 0.25 + r * 0.9);
      let sz = side * (0.1 + r * 0.05);
      // standing: arms hang loose, breathing
      sx += (1 - a) * Math.sin(t * 1.6 + i) * 0.02;
      // in the air: arms flung up and out
      sx = sx * (1 - this.air) + this.air * -2.4;
      el = el * (1 - this.air) + this.air * -0.4;
      sz = sz * (1 - this.air) + this.air * side * 0.5;
      // carrying: both forearms out in front, hands in round the bowl, barely swinging
      const h = this.hold;
      sx = sx * (1 - h) + h * (-0.55 + swing * 0.04 * a);
      el = el * (1 - h) + h * -1.0;
      sz = sz * (1 - h) + h * side * -0.2;
      this.shoulder[i].rotation.set(sx, 0, sz);
      this.elbow[i].rotation.x = el;
    }

    // hips bob twice a stride and roll toward the standing leg; the shoulders twist against them
    const bob = Math.abs(Math.cos(p)) * 0.045 * a - 0.03 * a - r * 0.03;
    const sway = (1 - a) * Math.sin(t * 0.3) * 0.015;
    this.hips.position.set(sway, HIP_Y + bob - this.air * 0.12, 0);
    this.hips.rotation.set(0, Math.sin(p) * 0.12 * a, Math.sin(p) * 0.05 * a);
    this.torso.rotation.set(0.04 * a + 0.22 * r + this.air * 0.1, -Math.sin(p) * 0.22 * a, -Math.sin(p) * 0.04 * a);
    // breathing
    const breath = Math.sin(t * 1.7);
    this.chest.scale.set(1 + breath * 0.012, 1, 1 + breath * 0.02);
    this.pack.rotation.x = Math.max(0, Math.cos(p * 2)) * 0.08 * a + r * 0.1;

    // the head steadies itself against the walk, and when he stands he looks about
    this.look.wait -= dt;
    if (this.look.wait <= 0) {
      this.look.want = a > 0.3 ? 0 : (Math.random() - 0.5) * 1.1;
      this.look.wait = 1.5 + Math.random() * 3.5;
    }
    this.look.now = ease(this.look.now, a > 0.3 ? 0 : this.look.want, 3);
    this.head.rotation.set(
      -0.05 * a - 0.15 * r + (1 - a) * Math.sin(t * 0.5) * 0.04,
      Math.sin(p) * 0.18 * a + this.look.now,
      Math.sin(p) * -0.04 * a,
    );

    // a blink every few seconds
    this.blink -= dt;
    if (this.blink <= 0) this.blink = 2.5 + Math.random() * 3.5;
    this.eyes.scale.y = this.blink < 0.12 ? 0.1 : 1;
  }

  /** Holds something in both hands in front of his chest (null puts it down). */
  carry(obj: Object3D | null) {
    if (this.carrying) this.chest.remove(this.carrying);
    this.carrying = obj;
    if (obj) {
      obj.position.set(0, 0.17, 0.42);
      this.chest.add(obj);
    }
  }

  dispose() {
    this.geometries.forEach((g) => g.dispose());
  }
}
