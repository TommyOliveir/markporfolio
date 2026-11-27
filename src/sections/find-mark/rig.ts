// One realistic person: a clone of a character model (see humans.ts) with its own skeleton and animation
// mixer. It blends its moves from how fast the figure goes (walk, jog and run kept in step, so feet don't
// slide), plays a pose when it stands or sits (idle, talking, looking about, sitting), bends its arms to
// targets with two-bone IK (holding instruments, eating, praying, painting, waving) and turns its head,
// all on top of the clips. Far away or off-screen it updates less often, or not at all.

import {
  AnimationMixer,
  Group,
  LoopRepeat,
  Matrix4,
  Quaternion,
  Sphere,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Bone,
  type Euler,
  type Frustum,
  type Material,
  type Object3D,
  type SkinnedMesh,
} from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";

export type ClipInfo = { duration: number; speed?: number; phase?: number };

/** A character model as loaded: its scene (the bind pose), its moves and what the build measured. */
export type Template = {
  id: string;
  scene: Object3D;
  clips: AnimationClip[];
  info: { rig: string; hips: number; height: number; clips: Record<string, ClipInfo> };
  /** model units → metres, for the height the figure should stand */
  scale: number;
  /** what its shadows are drawn with */
  depth?: Material;
};

/** What a figure is doing when it isn't on the move. */
export type Pose = "idle" | "sit" | "talk" | "look";
export type Side = "L" | "R";

/** Shared per frame by every figure: what the camera sees and where you are. */
/** `budget`: how many more figures may be re-posed this frame (each costs a little CPU). */
export type View = { frustum: Frustum; camera: Vector3; player: Vector3; frame: number; budget: number; lite: boolean };

/** Where a hand should go, relative to a landmark on the body, in metres for a 1.75 m person (x = to the figure's left, z = forward). */
export type Goal = { from: "chest" | "head" | "shoulder"; x: number; y: number; z: number };

type Arm = { upper: Bone; fore: Bone; hand: Bone; palm: Bone | null; out: 1 | -1 };

const LOCO = ["walk", "jog", "run"] as const;
/**
 * Seats are placed for the painted figures, whose hips are 0.82 m up: a bench, stool or pew's top is
 * this far above a seated figure's root (which is why the root goes below the floor).
 */
const PAINTED_SEAT = 0.82;

const _v1 = new Vector3();
const _v2 = new Vector3();
const _v3 = new Vector3();
const _v4 = new Vector3();
const _q1 = new Quaternion();
const _q2 = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _sphere = new Sphere();
const _speeds = [0, 0, 0];
const _iv = Array.from({ length: 8 }, () => new Vector3());
const _iq = Array.from({ length: 9 }, () => new Quaternion());
const _mix = [0, 0, 0];
const ID = new Quaternion();

export class Rig {
  readonly root = new Group();
  /** On the head, upright and facing forward in the idle pose, at the top of the skull: hats go here. */
  readonly headAnchor = new Group();
  /** On the upper back: a backpack. */
  readonly backAnchor = new Group();
  /** In the middle of the chest: what's carried in front of it (the bowl of pancit). */
  readonly chestAnchor = new Group();
  /** At the left hip: a bag. */
  readonly hipAnchor = new Group();
  readonly meshes: SkinnedMesh[] = [];
  readonly height: number;
  private model: Object3D;
  private refreshBones: () => void;
  private mixer: AnimationMixer;
  private actions = new Map<string, AnimationAction>();
  private clips: Record<string, ClipInfo>;
  private weights = new Map<string, number>();
  private bones: Record<"hips" | "spine2" | "neck" | "head", Bone>;
  private arms: Record<Side, Arm>;
  private unit = 1; // metres per model unit, with the figure's own scale
  private phase = Math.random();
  private moving = 0;
  private airborne = 0;
  private pose: Pose = "idle";
  private sitHips: number;
  private lift = 0;
  private pending = 0;
  private slot = Math.floor(Math.random() * 4);
  private shadows = true;
  // the layers on top of the clips, set fresh each frame
  private reachGoal: Record<Side, Goal | null> = { L: null, R: null };
  private reachDir: Record<Side, Vector3 | null> = { L: null, R: null };
  private reachWeight: Record<Side, number> = { L: 0, R: 0 };
  private lastTarget: Record<Side, Vector3> = { L: new Vector3(), R: new Vector3() };
  private headTurn = new Quaternion();
  // how the neck's and the head's parents sit in the figure (measured in the idle pose)
  private neckFrame = new Quaternion();
  private headFrame = new Quaternion();
  // the face, where the model has blendshapes
  private faces: { mesh: SkinnedMesh; blink: number[]; smile: number[] }[] = [];
  private blinkIn = 2 + Math.random() * 3;
  private smile = 0;
  private smileWant = 0;
  // standing still and not re-posed: the bones' world matrices (and the GPU's copy) stay as they are
  private placed = new Matrix4();
  private bonesMoved = true;
  private overdue = false;

  constructor(template: Template, swap?: (m: Material) => Material) {
    this.model = clone(template.scene);
    this.clips = template.info.clips;
    this.height = template.info.height * template.scale;
    this.model.traverse((o) => {
      const mesh = o as SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      if (swap) mesh.material = swap(mesh.material as Material);
      mesh.customDepthMaterial = template.depth; // (cloning leaves it behind)
      this.meshes.push(mesh);
      const dict = mesh.morphTargetDictionary;
      if (dict) {
        const find = (re: RegExp) =>
          Object.keys(dict)
            .filter((k) => re.test(k))
            .map((k) => dict[k]);
        const face = { mesh, blink: find(/^eyeBlink/), smile: find(/^mouthSmile/) };
        if (face.blink.length || face.smile.length) this.faces.push(face);
      }
    });
    // every part of a figure is skinned to the same bones: one skeleton between them means the bone
    // matrices are worked out and uploaded once a frame, not once per part
    const shared = this.meshes[0]?.skeleton;
    for (const m of this.meshes.slice(1))
      if (m.skeleton.bones.length === shared.bones.length && m.skeleton.bones.every((b, i) => b === shared.bones[i]))
        m.skeleton = shared;
    // Most of the town stands still (the band at ease, sitters, diners, the faithful). three.js would
    // still recompute and re-upload every bone of every figure every frame; these two skip that unless
    // the figure has moved or been re-posed.
    const model = this.model;
    const refresh = model.updateMatrixWorld.bind(model);
    model.updateMatrixWorld = () => {
      const parent = model.parent?.matrixWorld;
      if (parent && parent.equals(this.placed)) return;
      if (parent) this.placed.copy(parent);
      refresh(true);
      this.bonesMoved = true;
    };
    this.refreshBones = () => {
      this.root.updateWorldMatrix(true, false);
      this.placed.copy(this.root.matrixWorld);
      refresh(true);
      this.bonesMoved = true;
    };
    if (shared) {
      const upload = shared.update.bind(shared);
      shared.update = () => {
        if (!this.bonesMoved) return;
        this.bonesMoved = false;
        upload();
      };
    }
    this.root.add(this.model);
    this.root.scale.setScalar(template.scale);

    const bone = (name: string) => this.model.getObjectByName(name) as Bone;
    this.bones = { hips: bone("Hips"), spine2: bone("Spine2"), neck: bone("Neck"), head: bone("Head") };
    const arm = (side: "Left" | "Right", out: 1 | -1): Arm => ({
      upper: bone(`${side}Arm`),
      fore: bone(`${side}ForeArm`),
      hand: bone(`${side}Hand`),
      palm: (this.model.getObjectByName(`${side}HandMiddle1`) as Bone) ?? null,
      out,
    });
    this.arms = { L: arm("Left", 1), R: arm("Right", -1) };

    this.mixer = new AnimationMixer(this.model);
    for (const clip of template.clips) {
      const action = this.mixer.clipAction(clip);
      action.setLoop(LoopRepeat, Infinity);
      action.play();
      const loco = (LOCO as readonly string[]).includes(clip.name);
      action.timeScale = loco ? 0 : 1; // the walk cycles are driven by hand, in step with each other
      if (!loco) action.time = Math.random() * clip.duration;
      action.setEffectiveWeight(clip.name === "idle" ? 1 : 0);
      this.actions.set(clip.name, action);
      this.weights.set(clip.name, clip.name === "idle" ? 1 : 0);
    }
    // how high the hips sit in the sitting clip, so a seated figure lands on the seat
    const sit = template.clips.find((c) => c.name === "sit");
    const track = sit?.tracks.find((t) => t.name === "Hips.position");
    this.sitHips = (track ? track.values[1] : template.info.hips * 0.6) * template.scale;

    // hang the anchors in the idle pose, so hats sit straight on a head held up straight
    this.mixer.update(0);
    this.root.updateMatrixWorld(true);
    const s = template.info.height / 1.75; // model units for a 1.75 m person
    const top = this.model.getObjectByName("HeadTop_End");
    this.hang(this.headAnchor, this.bones.head, top ? top.getWorldPosition(new Vector3()) : null, 0);
    const back = this.bones.spine2.getWorldPosition(new Vector3());
    back.add(new Vector3(0, 0.04 * s, -0.11 * s).multiplyScalar(template.scale));
    this.hang(this.backAnchor, this.bones.spine2, back, 0);
    this.hang(this.chestAnchor, this.bones.spine2, null, 0);
    const hip = this.bones.hips.getWorldPosition(new Vector3());
    hip.add(new Vector3(0.2 * s, 0.02 * s, 0).multiplyScalar(template.scale));
    this.hang(this.hipAnchor, this.bones.hips, hip, 0);
    const toFigure = this.root.getWorldQuaternion(new Quaternion()).invert();
    this.neckFrame.copy(toFigure).multiply(this.bones.neck.parent!.getWorldQuaternion(new Quaternion()));
    this.headFrame.copy(toFigure).multiply(this.bones.neck.getWorldQuaternion(new Quaternion()));
  }

  /** Fixes `anchor` to `bone`, at a world point, turned so its axes match the figure's. */
  private hang(anchor: Group, bone: Bone, at: Vector3 | null, up: number) {
    bone.add(anchor);
    const rootQ = this.root.getWorldQuaternion(_q1);
    const boneQ = bone.getWorldQuaternion(_q2);
    anchor.quaternion.copy(boneQ.invert().multiply(rootQ));
    const point = at ?? bone.getWorldPosition(new Vector3()).add(new Vector3(0, up, 0));
    anchor.position.copy(bone.worldToLocal(point.clone()));
    // undo the bone's scale (the model's units), so accessories are in metres
    const scale = bone.getWorldScale(_v1);
    anchor.scale.setScalar(1 / scale.x);
  }

  /** The figure's own scale (children are smaller), once the rig is inside it. */
  setScale(figureScale: number) {
    this.unit = this.root.scale.x * figureScale;
  }

  hide(test: (m: Material) => boolean) {
    for (const m of this.meshes) if (test(m.material as Material)) m.visible = false;
  }

  setPose(pose: Pose) {
    this.pose = this.actions.has(pose) ? pose : "idle";
  }

  /** Puts a hand at a point by the body this frame (cleared after each update). */
  reach(side: Side, goal: Goal) {
    this.reachGoal[side] = goal;
  }

  /** Points an arm this way (a world direction) this frame: how the band's playing poses carry over. */
  point(side: Side, dir: Vector3) {
    (this.reachDir[side] ??= new Vector3()).copy(dir);
  }

  /** Turns the head (and a little of the neck) by this rotation, in the figure's own frame. */
  turnHead(e: Euler, amount = 1) {
    this.headTurn.setFromEuler(e);
    if (amount !== 1) this.headTurn.slerpQuaternions(ID, this.headTurn, amount);
  }

  setSmile(amount: number) {
    this.smileWant = amount;
  }

  /** Where a hand is, in the world: the palm, a little past the wrist. */
  palm(side: Side, out: Vector3) {
    const a = this.arms[side];
    out.setFromMatrixPosition(a.hand.matrixWorld);
    if (a.palm) out.lerp(_v4.setFromMatrixPosition(a.palm.matrixWorld), 0.6);
    return out;
  }

  /**
   * Called every frame. Decides whether this figure needs updating now (on screen, and often enough for
   * how far away it is), and if so plays the clips and the layers on top. Returns whether it did.
   */
  tick(dt: number, view: View, speed: number, air: boolean) {
    this.pending = Math.min(this.pending + dt, 0.5);
    const at = this.root.getWorldPosition(_v1);
    const shadows = at.distanceTo(view.player) < 30;
    if (shadows !== this.shadows) {
      this.shadows = shadows;
      for (const m of this.meshes) m.castShadow = shadows && m.userData.castsShadow !== false;
    }
    // hidden (the worshippers while you're outside St. Anne's) or off-screen: nothing to do
    for (let o: Object3D | null = this.root; o; o = o.parent) if (!o.visible) return false;
    _sphere.center.copy(at).y += this.height * 0.5;
    _sphere.radius = this.height;
    if (!view.frustum.intersectsSphere(_sphere)) return false;
    const d = at.distanceTo(view.camera);
    const every = view.lite ? (d < 10 ? 1 : d < 25 ? 2 : d < 50 ? 4 : 8) : d < 15 ? 1 : d < 35 ? 2 : d < 70 ? 4 : 8;
    if (!this.overdue && (view.frame + this.slot) % every !== 0) return false;
    // out of this frame's budget: first in line next frame
    if (view.budget <= 0) {
      this.overdue = true;
      return false;
    }
    view.budget--;
    this.overdue = false;
    this.update(this.pending, speed, air);
    this.pending = 0;
    return true;
  }

  private update(dt: number, speed: number, air: boolean) {
    const ease = (v: number, to: number, k: number) => v + (to - v) * Math.min(dt * k, 1);
    this.moving = ease(this.moving, Math.min(Math.max((speed - 0.12) / 0.5, 0), 1), 8);
    this.airborne = ease(this.airborne, air ? 1 : 0, 12);

    // walk → jog → run, by speed against each clip's natural speed (for this figure's size)
    const v = _speeds;
    const mix = _mix.fill(0);
    LOCO.forEach((n, i) => (v[i] = (this.clips[n]?.speed ?? 1.4) * this.unit));
    if (speed <= v[0]) mix[0] = 1;
    else if (speed <= v[1]) {
      const t = (speed - v[0]) / (v[1] - v[0]);
      mix[0] = 1 - t;
      mix[1] = t;
    } else if (speed <= v[2]) {
      const t = (speed - v[1]) / (v[2] - v[1]);
      mix[1] = 1 - t;
      mix[2] = t;
    } else mix[2] = 1;
    // one shared step phase: the blended stride's length sets the cadence
    let stride = 0;
    LOCO.forEach((n, i) => (stride += mix[i] * v[i] * (this.clips[n]?.duration ?? 1)));
    if (speed > 0.05 && stride > 0) this.phase = (this.phase + (dt * speed) / stride) % 1;
    LOCO.forEach((n) => {
      const a = this.actions.get(n);
      const c = this.clips[n];
      if (a && c) a.time = ((this.phase + (c.phase ?? 0)) % 1) * c.duration;
    });

    // in the air: mostly the falling pose, over the stride it left the ground with
    const ground = 1 - this.airborne * 0.7;
    const want = (name: string) => {
      const i = (LOCO as readonly string[]).indexOf(name);
      if (i >= 0) return mix[i] * this.moving * ground;
      if (name === "fall") return this.airborne * 0.7;
      return name === this.pose ? (1 - this.moving) * ground : 0;
    };
    for (const [name, action] of this.actions) {
      let w = ease(this.weights.get(name) ?? 0, want(name), 10);
      if (w < 0.002)
        w = 0; // a clip at no weight isn't played at all
      else if (w > 0.998) w = 1;
      this.weights.set(name, w);
      action.setEffectiveWeight(w);
    }
    this.mixer.update(dt);

    // seated: the rig rises (or sinks) so it sits on whatever a painted figure would have sat on
    const seated = this.pose === "sit" ? 1 - this.moving : 0;
    const seatHere = this.sitHips - 0.1 * (this.height / 1.75);
    this.lift = ease(this.lift, seated * (PAINTED_SEAT - seatHere), 8);
    this.root.position.y = this.lift;

    // the face
    if (this.faces.length) {
      this.blinkIn -= dt;
      if (this.blinkIn < -0.14) this.blinkIn = 2.2 + Math.random() * 3.8;
      const blink = this.blinkIn < 0 ? Math.sin((-this.blinkIn / 0.14) * Math.PI) : 0;
      this.smile = ease(this.smile, this.smileWant, 3);
      for (const f of this.faces) {
        const inf = f.mesh.morphTargetInfluences!;
        f.blink.forEach((i) => (inf[i] = blink));
        f.smile.forEach((i) => (inf[i] = this.smile));
      }
    }

    this.head();
    this.headTurn.identity();
    // the bones' world matrices, worked out once here; placing a hand then keeps them up to date bone
    // by bone (asking each bone for its world position would recompute all its parents every time)
    this.refreshBones();
    for (const side of ["L", "R"] as const) this.arm(side, dt);
    this.smileWant = 0;
  }

  /**
   * The head turn, split between neck and head. It's in the figure's frame; each bone takes it in its
   * parent's frame, using how that parent sat in the idle pose (close enough for a turn of the head).
   */
  private head() {
    if (this.headTurn.equals(ID)) return;
    for (const [bone, frame, share] of [
      [this.bones.neck, this.neckFrame, 0.4],
      [this.bones.head, this.headFrame, 0.6],
    ] as const) {
      const part = _q1.slerpQuaternions(ID, this.headTurn, share);
      const inParent = _q2.copy(frame).invert().multiply(part).multiply(frame);
      bone.quaternion.premultiply(inParent);
    }
  }

  /** Two-bone IK: shoulder, elbow, wrist; the elbow bends out, down and back. */
  private arm(side: Side, dt: number) {
    const a = this.arms[side];
    const goal = this.reachGoal[side];
    const dir = this.reachDir[side];
    this.reachGoal[side] = null;
    this.reachDir[side] = null;
    const wantW = goal || dir ? 1 : 0;
    const w = (this.reachWeight[side] += (wantW - this.reachWeight[side]) * Math.min(dt * 8, 1));
    if (w < 0.01) return;

    const at = (o: Object3D, out: Vector3) => out.setFromMatrixPosition(o.matrixWorld);
    const turn = (o: Object3D, out: Quaternion) => {
      o.matrixWorld.decompose(_p, out, _s);
      return out;
    };
    const S = at(a.upper, _iv[0]);
    const E = at(a.fore, _iv[1]);
    const W = at(a.hand, _iv[2]);
    const upper = S.distanceTo(E);
    const lower = E.distanceTo(W);
    const figure = turn(this.root, _iq[0]);
    const u = this.height / 1.75;
    const size = this.root.matrixWorld.getMaxScaleOnAxis() / this.root.scale.x; // the figure's own scale
    const target = this.lastTarget[side];
    if (goal) {
      const from =
        goal.from === "head" ? at(this.bones.head, _v2) : goal.from === "chest" ? at(this.bones.spine2, _v2) : S;
      target.copy(from).add(
        _v3
          .set(goal.x, goal.y, goal.z)
          .multiplyScalar(u * size)
          .applyQuaternion(figure),
      );
    } else if (dir) target.copy(S).addScaledVector(dir, (upper + lower) * 0.8);

    const toT = _v2.copy(target).sub(S);
    const dist = Math.min(Math.max(toT.length(), Math.abs(upper - lower) + 1e-3), (upper + lower) * 0.999);
    toT.normalize();
    const cosA = (upper * upper + dist * dist - lower * lower) / (2 * upper * dist);
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const pole = _v3.set(a.out * 0.55, -0.45, -0.7).applyQuaternion(figure);
    pole.addScaledVector(toT, -pole.dot(toT));
    if (pole.lengthSq() < 1e-6) pole.set(0, -1, 0);
    pole.normalize();
    const elbow = _iv[5]
      .copy(S)
      .addScaledVector(toT, upper * cosA)
      .addScaledVector(pole, upper * sinA);
    const wrist = _iv[6].copy(S).addScaledVector(toT, dist);

    const clipUpper = _iq[7].copy(a.upper.quaternion);
    const clipFore = _iq[8].copy(a.fore.quaternion);
    // upper arm: swing the elbow onto its place
    const swing = _iq[1].setFromUnitVectors(E.sub(S).normalize(), _iv[7].copy(elbow).sub(S).normalize());
    const parentQ = turn(a.upper.parent!, _iq[2]);
    const upperW = turn(a.upper, _iq[3]);
    a.upper.quaternion.copy(parentQ.invert().multiply(swing.multiply(upperW)));
    a.upper.updateMatrixWorld(true);
    // forearm: swing the wrist onto the target
    const E2 = at(a.fore, _iv[3]);
    const W2 = at(a.hand, _iv[4]);
    const swing2 = _iq[4].setFromUnitVectors(W2.sub(E2).normalize(), wrist.sub(E2).normalize());
    const upperW2 = turn(a.upper, _iq[5]);
    const foreW = turn(a.fore, _iq[6]);
    a.fore.quaternion.copy(upperW2.invert().multiply(swing2.multiply(foreW)));
    if (w < 0.999) {
      a.upper.quaternion.slerpQuaternions(clipUpper, a.upper.quaternion, w);
      a.fore.quaternion.slerpQuaternions(clipFore, a.fore.quaternion, w);
    }
    a.upper.updateMatrixWorld(true);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    new Set(this.meshes.map((m) => m.skeleton)).forEach((s) => s.dispose());
  }
}
