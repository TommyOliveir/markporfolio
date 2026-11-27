// Builds the realistic townsfolk for the "Where's Mark?" walk. It reads the downloaded characters
// (assets/mixamo/characters: Mixamo FBX files or Ara 3D Gen GLB files) and the Mixamo moves
// (assets/mixamo/moves), and writes one compressed GLB per character to public/models/people/. Every
// move is retargeted onto each character's own skeleton, so the page needs no animation files of its own.
//
//   node scripts/build-people.mjs
//
// Mixamo's characters and animations may be used in a game or a site, but not passed on as raw files,
// so assets/ is git-ignored and only the built GLBs are committed.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir, type } from "node:os";
import { basename, join as joinPath } from "node:path";
import { fileURLToPath } from "node:url";
import { Logger, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTTextureWebP } from "@gltf-transform/extensions";
import {
  cloneDocument,
  compactPrimitive,
  compressTexture,
  dedup,
  joinPrimitives,
  meshopt,
  prune,
  resample,
  simplifyPrimitive,
  weld,
} from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { Matrix4, Quaternion, Vector3 } from "three";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = joinPath(ROOT, "assets", "mixamo");
const OUT = joinPath(ROOT, "public", "models", "people");
const FBX2GLTF = joinPath(
  ROOT,
  "node_modules",
  "fbx2gltf",
  "bin",
  type(),
  type() === "Windows_NT" ? "FBX2glTF.exe" : "FBX2glTF",
);

/** Parts a crowd figure never shows from a few metres away. */
const CROWD_DROP = /^(Mouth|Teeth|Tongue|Skin details|Eyelashes)$|Eyelashes/;

/**
 * tier: "hero" (seen close up: full detail, plus a `-lite` copy with smaller textures for phones) or
 * "crowd" (simplified, small textures). `drop` removes parts by material or mesh name; `morphs` keeps
 * those facial blendshapes (everything else is stripped, it costs a lot of GPU memory).
 */
const MODELS = {
  player: { src: "player.fbx", tier: "hero" },
  mark: {
    src: "mark.glb",
    tier: "hero",
    drop: /^Hat$/, // Mark wears his beret instead of the detective's fedora
    morphs: /^(eyeBlink(Left|Right)|mouthSmile(Left|Right)?|browInnerUp|jawOpen)$/,
  },
  "man-1": { src: "man-1.glb", tier: "crowd" },
  "man-2": { src: "man-2.fbx", tier: "crowd" },
  "man-3": { src: "man-3.glb", tier: "crowd" },
  "woman-1": { src: "woman-1.fbx", tier: "crowd" },
  "woman-2": { src: "woman-2.fbx", tier: "crowd" },
  "woman-3": { src: "woman-3.fbx", tier: "crowd" },
};

// (Mixamo's "Waving" isn't among them: it's half a second of a raised hand. A wave is done with IK.)
const MOVES = ["idle", "walk", "jog", "run", "fall", "sit", "look", "talk"];
/** Moves that travel: their forward drift is taken out (the game moves the figure) and measured. */
const LOCOMOTION = new Set(["walk", "jog", "run"]);

/** Crowd figures are simplified to about this many triangles (hair cards excepted). */
const CROWD_TRIANGLES = 12000;

/** Longest texture side by material kind; normal maps match, roughness maps are half. */
const TEXTURES = {
  hero: { atlas: 2048, skin: 2048, cloth: 2048, decal: 2048, hat: 1024, hair: 1024, eyes: 512, inner: 512, glass: 256 },
  lite: { atlas: 1024, skin: 1024, cloth: 1024, decal: 1024, hat: 512, hair: 512, eyes: 256, inner: 256, glass: 128 },
  crowd: { atlas: 1024, skin: 512, cloth: 512, decal: 512, hat: 512, hair: 512, eyes: 256, inner: 256, glass: 128 },
};

// The bone each bone points at, where it has more than one child.
const AIM = {
  Hips: "Spine",
  Spine2: "Neck",
  Head: "HeadTop_End",
  LeftHand: "LeftHandMiddle1",
  RightHand: "RightHandMiddle1",
};

/** Bone pairs the retarget check compares. */
const LIMBS = [
  ["Spine", "Neck"],
  ["Neck", "Head"],
  ["LeftArm", "LeftForeArm"],
  ["LeftForeArm", "LeftHand"],
  ["RightArm", "RightForeArm"],
  ["RightForeArm", "RightHand"],
  ["LeftUpLeg", "LeftLeg"],
  ["LeftLeg", "LeftFoot"],
  ["RightUpLeg", "RightLeg"],
  ["RightLeg", "RightFoot"],
  ["LeftFoot", "LeftToeBase"],
];

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const quiet = new Logger(Logger.Verbosity.WARN);
const io = new NodeIO()
  .setLogger(quiet)
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const tmp = mkdtempSync(joinPath(tmpdir(), "people-"));

async function main() {
  mkdirSync(OUT, { recursive: true });
  // `node scripts/build-people.mjs mark` rebuilds just that one
  const only = process.argv.slice(2);
  try {
    const moves = [];
    for (const name of MOVES) {
      const doc = await readAsset(joinPath(SRC, "moves", `${name}.fbx`));
      moves.push({ name, ...sampleClip(doc) });
    }
    console.log(`moves: ${moves.map((m) => `${m.name} ${m.duration.toFixed(2)}s`).join(", ")}`);
    for (const [id, cfg] of Object.entries(MODELS))
      if (!only.length || only.includes(id)) await buildModel(id, cfg, moves);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ——— reading ———

async function readAsset(path) {
  let doc;
  if (path.endsWith(".glb")) doc = await io.read(path);
  else {
    const out = joinPath(tmp, `${basename(path, ".fbx")}-${Math.random().toString(36).slice(2, 8)}`);
    execFileSync(FBX2GLTF, ["--binary", "--input", path, "--output", out], { stdio: "pipe" });
    doc = await io.read(`${out}.glb`);
  }
  doc.setLogger(quiet);
  // Mixamo prefixes its bones (mixamorig:, mixamorig1:, …); strip it so every skeleton matches.
  for (const node of doc.getRoot().listNodes()) node.setName(node.getName().replace(/^mixamorig\d*[:_]/, ""));
  return doc;
}

// ——— maths on gltf-transform nodes ———

const v3 = (a) => new Vector3(a[0], a[1], a[2]);
const q4 = (a) => new Quaternion(a[0], a[1], a[2], a[3]);
const localMatrix = (n) => new Matrix4().compose(v3(n.getTranslation()), q4(n.getRotation()), v3(n.getScale()));
function worldMatrix(node) {
  const chain = [];
  for (let n = node; n; n = n.getParentNode()) chain.unshift(n);
  const m = new Matrix4();
  for (const n of chain) m.multiply(localMatrix(n));
  return m;
}
function decompose(m) {
  const p = new Vector3();
  const q = new Quaternion();
  m.decompose(p, q, new Vector3());
  return { p, q };
}
/** The node and everything under it, parents first. */
function subtree(node) {
  const out = [node];
  for (let i = 0; i < out.length; i++) out.push(...out[i].listChildren());
  return out;
}

// ——— source moves ———

/** Every bone's world rotation at every frame (24 or 30 fps, whatever Mixamo gave), plus the rest pose. */
function sampleClip(doc) {
  const root = doc.getRoot();
  const anim = root.listAnimations().find((a) => a.listChannels().length > 0);
  if (!anim) throw new Error("a move has no animation");
  const tracks = new Map();
  let end = 0;
  let keys = 0;
  for (const ch of anim.listChannels()) {
    const s = ch.getSampler();
    const times = s.getInput().getArray();
    const values = s.getOutput().getArray();
    end = Math.max(end, times[times.length - 1]);
    keys = Math.max(keys, times.length);
    const e = tracks.get(ch.getTargetNode()) ?? {};
    e[ch.getTargetPath()] = { times, values };
    tracks.set(ch.getTargetNode(), e);
  }
  const fps = Math.round((keys - 1) / end);
  const frames = Math.round(end * fps) + 1;
  const times = Array.from({ length: frames }, (_, i) => Math.min(i / fps, end));

  const hips = root.listNodes().find((n) => n.getName() === "Hips");
  const bones = subtree(hips);
  const above = worldMatrix(hips.getParentNode());
  const rest = new Map();
  for (const b of bones) rest.set(b.getName(), decompose(worldMatrix(b)));

  const world = []; // per frame: name → world quaternion
  const pos = []; // per frame: name → world position
  const hipsAt = [];
  const footAt = [];
  for (const t of times) {
    const m = new Map();
    const q = new Map();
    const p = new Map();
    for (const b of bones) {
      const tr = tracks.get(b);
      const local = new Matrix4().compose(
        tr?.translation ? sampleVec(tr.translation, t) : v3(b.getTranslation()),
        tr?.rotation ? sampleQuat(tr.rotation, t) : q4(b.getRotation()),
        v3(b.getScale()),
      );
      const parent = b === hips ? above : m.get(b.getParentNode());
      const w = parent.clone().multiply(local);
      m.set(b, w);
      const d = decompose(w);
      q.set(b.getName(), d.q);
      p.set(b.getName(), d.p);
    }
    world.push(q);
    pos.push(p);
    hipsAt.push(decompose(m.get(hips)).p);
    const foot = bones.find((b) => b.getName() === "LeftFoot");
    footAt.push(foot ? decompose(m.get(foot)).p : new Vector3());
  }
  return { times, duration: end, rest, world, pos, hipsAt, footAt };
}

function sampleVec({ times, values }, t) {
  const [i, f] = locate(times, t);
  const a = v3(values.subarray(i * 3, i * 3 + 3));
  if (f === 0) return a;
  return a.lerp(v3(values.subarray(i * 3 + 3, i * 3 + 6)), f);
}
function sampleQuat({ times, values }, t) {
  const [i, f] = locate(times, t);
  const a = q4(values.subarray(i * 4, i * 4 + 4));
  if (f === 0) return a;
  return a.slerp(q4(values.subarray(i * 4 + 4, i * 4 + 8)), f);
}
function locate(times, t) {
  if (t <= times[0]) return [0, 0];
  for (let i = 0; i < times.length - 1; i++)
    if (t <= times[i + 1]) return [i, (t - times[i]) / (times[i + 1] - times[i])];
  return [times.length - 1, 0];
}

// ——— characters ———

async function buildModel(id, cfg, moves) {
  const doc = await readAsset(joinPath(SRC, "characters", cfg.src));
  const root = doc.getRoot();
  const hero = cfg.tier === "hero";

  // the model's own clips go (Ara's Idle/Walk/Run, Mixamo's empty take): every figure uses the same moves
  root.listAnimations().forEach((a) => a.dispose());

  const drop = new RegExp([cfg.drop?.source, hero ? null : CROWD_DROP.source].filter(Boolean).join("|") || "$^");
  for (const mesh of root.listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const name = prim.getMaterial()?.getName() ?? "";
      if (drop.test(name) || drop.test(mesh.getName())) prim.dispose();
    }

  const skin = unifySkin(doc);
  stripMorphs(doc, cfg.morphs);
  for (const prim of root.listMeshes()[0].listPrimitives()) {
    if (prim.getAttribute("TEXCOORD_1")) prim.setAttribute("TEXCOORD_1", null);
    compactPrimitive(prim);
  }
  await doc.transform(dedup(), weld());

  if (!hero) {
    const prims = root.listMeshes()[0].listPrimitives();
    const solid = prims.filter((p) => !/hair|brow|lash|beard|buzz/i.test(p.getMaterial()?.getName() ?? ""));
    const tris = solid.reduce((s, p) => s + p.getIndices().getCount() / 3, 0);
    const ratio = Math.min(1, CROWD_TRIANGLES / tris);
    for (const p of solid)
      if (p.getIndices().getCount() / 3 > 1500)
        simplifyPrimitive(p, { simplifier: MeshoptSimplifier, ratio, error: 0.004 });
  }

  for (const m of root.listMaterials()) fixMaterial(m);
  mergeSolids(doc);
  await doc.transform(dedup());
  joinByMaterial(root.listMeshes()[0]);
  await doc.transform(prune());

  const { info, worst } = retargetAll(doc, skin, moves);
  if (!hero) stripFingers(doc, skin);
  info.height = +meshTop(doc).toFixed(3);
  console.log(`${id.padEnd(12)} retarget check: worst ${worst.e.toFixed(1)}° (${worst.where})`);
  root.listScenes()[0].setExtras({ people: info });

  const variants = hero
    ? [
        ["", "hero"],
        ["-lite", "lite"],
      ]
    : [["", "crowd"]];
  for (const [suffix, tier] of variants) {
    const out = suffix ? cloneDocument(doc) : doc;
    await sizeTextures(out, TEXTURES[tier]);
    await out.transform(prune(), dedup(), resample(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
    const file = joinPath(OUT, `${id}${suffix}.glb`);
    await io.write(file, out);
    report(`${id}${suffix}`, out, file, info);
  }
}

/**
 * Converted FBX files give every mesh its own skin with its own list of joints. Put every part on one
 * skin and one mesh node, so parts that share a material can be joined into a single draw call.
 */
function unifySkin(doc) {
  const root = doc.getRoot();
  const nodes = root.listNodes().filter((n) => n.getMesh() && n.getSkin());
  const ibm = new Map();
  for (const n of nodes) {
    const s = n.getSkin();
    const mats = s.getInverseBindMatrices().getArray();
    s.listJoints().forEach((j, i) => ibm.has(j) || ibm.set(j, mats.slice(i * 16, i * 16 + 16)));
  }
  const hips = [...ibm.keys()].find((j) => j.getName() === "Hips");
  const joints = subtree(hips).filter((j) => ibm.has(j));
  const index = new Map(joints.map((j, i) => [j, i]));

  const buffer = root.listBuffers()[0];
  const matrices = new Float32Array(joints.length * 16);
  joints.forEach((j, i) => matrices.set(ibm.get(j), i * 16));
  const skin = doc
    .createSkin("skin")
    .setInverseBindMatrices(doc.createAccessor().setType("MAT4").setArray(matrices).setBuffer(buffer));
  joints.forEach((j) => skin.addJoint(j));

  const mesh = doc.createMesh("body");
  for (const n of nodes) {
    const old = n.getSkin().listJoints();
    const source = n.getMesh();
    if (source.getExtras()?.targetNames) mesh.setExtras({ targetNames: source.getExtras().targetNames });
    if (source.getWeights().length) mesh.setWeights(source.getWeights());
    for (const prim of source.listPrimitives()) {
      for (const semantic of prim.listSemantics().filter((s) => s.startsWith("JOINTS_"))) {
        const acc = prim.getAttribute(semantic).clone();
        const a = acc.getArray();
        for (let i = 0; i < a.length; i++) a[i] = index.get(old[a[i]]) ?? 0;
        acc.setArray(a);
        prim.setAttribute(semantic, acc);
      }
      source.removePrimitive(prim);
      mesh.addPrimitive(prim);
    }
    n.setMesh(null).setSkin(null);
    source.dispose();
  }
  const node = doc.createNode("body").setMesh(mesh).setSkin(skin);
  root.listScenes()[0].addChild(node);
  return skin;
}

/** gltf-transform's join() leaves skinned meshes alone, so parts sharing a material are joined here. */
function joinByMaterial(mesh) {
  const ids = new Map();
  const groups = new Map();
  for (const p of mesh.listPrimitives()) {
    const m = p.getMaterial();
    if (!ids.has(m)) ids.set(m, ids.size);
    const attrs = p
      .listSemantics()
      .sort()
      .map((s) => `${s}:${p.getAttribute(s).getComponentType()}:${p.getAttribute(s).getElementSize()}`);
    const key = [ids.get(m), p.getMode(), p.listTargets().length, ...attrs].join("|");
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const joined = joinPrimitives(group);
    for (const p of group) {
      mesh.removePrimitive(p);
      p.dispose();
    }
    mesh.addPrimitive(joined);
  }
}

function stripMorphs(doc, keep) {
  for (const mesh of doc.getRoot().listMeshes()) {
    const names = mesh.getExtras()?.targetNames ?? [];
    const kept = names.map((n, i) => (keep?.test(n) ? i : -1)).filter((i) => i >= 0);
    for (const prim of mesh.listPrimitives())
      prim.listTargets().forEach((t, i) => kept.includes(i) || prim.removeTarget(t));
    if (names.length) {
      mesh.setWeights(kept.map(() => 0));
      mesh.setExtras({ targetNames: kept.map((i) => names[i]) });
    }
  }
}

/**
 * Plain-coloured parts (waistbands, stitching, straps…) each come with a material of their own, which
 * costs a draw call per figure. Their colour goes into the vertices instead and they share one material.
 */
function mergeSolids(doc) {
  const root = doc.getRoot();
  const buffer = root.listBuffers()[0];
  const plain = (m) =>
    m &&
    !m.getBaseColorTexture() &&
    !m.getNormalTexture() &&
    !m.getMetallicRoughnessTexture() &&
    m.getMetallicFactor() === 0 &&
    m.getAlphaMode() === "OPAQUE" &&
    m.getExtras()?.kind === "cloth";
  const prims = root.listMeshes().flatMap((mesh) => mesh.listPrimitives().filter((p) => plain(p.getMaterial())));
  if (prims.length < 2) return;
  const roughness = prims.reduce((s, p) => s + p.getMaterial().getRoughnessFactor(), 0) / prims.length;
  const solid = doc.createMaterial("Solid").setRoughnessFactor(roughness).setMetallicFactor(0);
  solid.setExtras({ kind: "cloth" });
  for (const p of prims) {
    const c = p.getMaterial().getBaseColorFactor();
    const n = p.getAttribute("POSITION").getCount();
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) colors.set([c[0], c[1], c[2]], i * 3);
    p.setAttribute("COLOR_0", doc.createAccessor().setType("VEC3").setArray(colors).setBuffer(buffer));
    p.setMaterial(solid);
  }
}

/** Top of the head (or hair), ignoring hats: what the page scales each figure by. */
function meshTop(doc) {
  let top = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const p of mesh.listPrimitives())
      if (p.getMaterial()?.getExtras()?.kind !== "hat") top = Math.max(top, p.getAttribute("POSITION").getMax([])[1]);
  return top;
}

/** What kind of surface a material is, from its name; the page tunes skin, hair, eyes… by this. */
function kindOf(name) {
  if (/lens/i.test(name)) return "glass";
  if (/skin details|_MAT2$/i.test(name)) return "decal";
  if (/hair|brow|lash|beard|buzz/i.test(name)) return "hair";
  if (/^eyes$/i.test(name)) return "eyes";
  if (/^(mouth|teeth|tongue)$/i.test(name)) return "inner";
  if (/^skin$/i.test(name)) return "skin";
  if (/_body$|Body_MAT/i.test(name)) return "atlas";
  if (/^hat$/i.test(name)) return "hat";
  return "cloth";
}

function fixMaterial(m) {
  const kind = kindOf(m.getName());
  m.setExtras({ kind });
  const c = m.getBaseColorFactor();
  // FBX diffuse comes over at 80 %, which only darkens the texture
  if (Math.abs(c[0] - 0.8) < 1e-3 && Math.abs(c[1] - 0.8) < 1e-3 && Math.abs(c[2] - 0.8) < 1e-3)
    m.setBaseColorFactor([1, 1, 1, c[3] || 1]);
  if (kind === "hair" || kind === "decal") m.setBaseColorFactor([1, 1, 1, 1]);
  // nothing anyone wears here is bare metal, except glasses frames and the odd strap
  if (!/frame|strap|buckle/i.test(m.getName())) m.setMetallicFactor(0);
  if (!m.getMetallicRoughnessTexture() && m.getRoughnessFactor() < 0.45 && kind !== "glass" && kind !== "eyes")
    m.setRoughnessFactor(kind === "hair" ? 0.5 : 0.62);
  if (m.getOcclusionTexture()) m.setOcclusionTexture(null);
}

// ——— retargeting ———

/**
 * Puts every move on this skeleton. Mixamo's moves were made on a T-pose; Ara's skeletons rest in an
 * A-pose with the hips and spine tilted. So each bone's rest pose is first turned until it points the
 * way the source bone points at rest, then it takes the source's rotation away from rest in world space.
 * That keeps a pose's shape (an arm hanging down stays hanging down) whatever pose either rested in.
 */
function retargetAll(doc, skin, moves) {
  const root = doc.getRoot();
  const buffer = root.listBuffers()[0];
  const joints = skin.listJoints();
  const byName = new Map(joints.map((j) => [j.getName(), j]));
  const hips = byName.get("Hips");
  const restT = new Map(joints.map((j) => [j, decompose(worldMatrix(j))]));
  const aboveHips = worldMatrix(hips.getParentNode());
  const aboveQ = decompose(aboveHips).q;
  const aboveInv = aboveHips.clone().invert();
  const hipsY = restT.get(hips).p.y;
  const top = byName.get("HeadTop_End") ?? byName.get("Head");
  const worst = { e: 0, where: "" };
  const info = {
    rig: joints.some((j) => j.getName() === "Jaw") ? "ara" : "mixamo",
    hips: hipsY,
    height: restT.get(top).p.y,
    clips: {},
  };

  for (const move of moves) {
    const sourceHipsY = move.rest.get("Hips").p.y;
    const k = hipsY / sourceHipsY;
    const align = new Map();
    for (const j of joints) {
      const name = j.getName();
      const kid =
        AIM[name] ??
        j
          .listChildren()
          .find((c) => byName.has(c.getName()))
          ?.getName();
      const parentAlign = align.get(j.getParentNode()) ?? new Quaternion();
      if (!move.rest.has(name) || !kid || !move.rest.has(kid) || !byName.has(kid)) {
        align.set(j, parentAlign.clone());
        continue;
      }
      const dT = restT.get(byName.get(kid)).p.clone().sub(restT.get(j).p).normalize();
      const dS = move.rest.get(kid).p.clone().sub(move.rest.get(name).p).normalize();
      align.set(j, new Quaternion().setFromUnitVectors(dT, dS));
    }

    const matched = joints.filter((j) => move.rest.has(j.getName()));
    const frames = move.times.length;
    const out = new Map(matched.map((j) => [j, new Float32Array(frames * 4)]));
    const hipsOut = new Float32Array(frames * 3);
    const drift = LOCOMOTION.has(move.name)
      ? move.hipsAt[frames - 1].clone().sub(move.hipsAt[0]).setY(0)
      : new Vector3();
    const restHipsS = move.rest.get("Hips").p;

    for (let f = 0; f < frames; f++) {
      const g = new Map();
      for (const j of joints) {
        const parentG = j === hips ? aboveQ : g.get(j.getParentNode());
        const name = j.getName();
        let G;
        if (move.rest.has(name)) {
          const S = move.world[f].get(name);
          const S0inv = move.rest.get(name).q.clone().invert();
          G = S.clone().multiply(S0inv).multiply(align.get(j)).multiply(restT.get(j).q);
        } else G = parentG.clone().multiply(q4(j.getRotation()));
        g.set(j, G);
        if (out.has(j)) {
          const local = parentG.clone().invert().multiply(G);
          const arr = out.get(j);
          if (f > 0) {
            const prev = new Quaternion().fromArray(arr, (f - 1) * 4);
            if (prev.dot(local) < 0) local.set(-local.x, -local.y, -local.z, -local.w);
          }
          local.toArray(arr, f * 4);
        }
      }
      const d = move.hipsAt[f].clone().sub(restHipsS);
      d.sub(drift.clone().multiplyScalar(f / (frames - 1)));
      const world = restT.get(hips).p.clone().add(d.multiplyScalar(k));
      world.applyMatrix4(aboveInv).toArray(hipsOut, f * 3);
    }

    const anim = doc.createAnimation(move.name);
    const input = doc.createAccessor().setType("SCALAR").setArray(new Float32Array(move.times)).setBuffer(buffer);
    const add = (node, path, array, type) => {
      const sampler = doc
        .createAnimationSampler()
        .setInput(input)
        .setOutput(doc.createAccessor().setType(type).setArray(array).setBuffer(buffer))
        .setInterpolation("LINEAR");
      anim.addSampler(sampler);
      anim.addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(sampler));
    };
    for (const [j, arr] of out) add(j, "rotation", arr, "VEC4");
    add(hips, "translation", hipsOut, "VEC3");

    // Check the result: rebuilt from the new tracks, each limb should point the way the source's does
    // (proportions differ, directions shouldn't). A few degrees is rounding; a broken retarget is tens.
    for (const f of [0, Math.floor(frames / 3), Math.floor((frames * 2) / 3)]) {
      const W = new Map();
      for (const j of joints) {
        const q = out.has(j) ? new Quaternion().fromArray(out.get(j), f * 4) : q4(j.getRotation());
        const t = j === hips ? new Vector3().fromArray(hipsOut, f * 3) : v3(j.getTranslation());
        const parent = j === hips ? aboveHips : W.get(j.getParentNode());
        W.set(j, parent.clone().multiply(new Matrix4().compose(t, q, v3(j.getScale()))));
      }
      const at = (name) => new Vector3().setFromMatrixPosition(W.get(byName.get(name)));
      for (const [a, b] of LIMBS) {
        if (!byName.has(a) || !byName.has(b) || !move.pos[f].has(a) || !move.pos[f].has(b)) continue;
        const t = at(b).sub(at(a)).normalize();
        const s = move.pos[f].get(b).clone().sub(move.pos[f].get(a)).normalize();
        const e = (t.angleTo(s) * 180) / Math.PI;
        if (e > worst.e) Object.assign(worst, { e, where: `${move.name} ${a}→${b}` });
      }
    }

    const clip = { duration: +move.duration.toFixed(4) };
    if (LOCOMOTION.has(move.name)) {
      clip.speed = +((Math.hypot(drift.x, drift.z) / move.duration) * k).toFixed(3);
      // where in the cycle the left foot is furthest forward, so walk, jog and run can be kept in step
      let best = 0;
      for (let f = 1; f < frames; f++)
        if (move.footAt[f].z - move.hipsAt[f].z > move.footAt[best].z - move.hipsAt[best].z) best = f;
      clip.phase = +(best / (frames - 1)).toFixed(3);
    }
    info.clips[move.name] = clip;
  }
  info.hips = +info.hips.toFixed(3);
  return { info, worst };
}

// ——— fewer bones for the crowd ———

const FINGER = /^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)\d$/;

/**
 * A crowd figure's fingers are 40 of its ~70 bones, and every bone costs time on every frame. So the
 * fingers are set in a relaxed curl (as in the idle move), baked into the mesh, and handed to the hand
 * bone; the finger bones, and their tracks in every move, go.
 */
function stripFingers(doc, skin) {
  const root = doc.getRoot();
  const joints = skin.listJoints();
  const ibmArray = skin.getInverseBindMatrices().getArray();
  const ibm = (i) => new Matrix4().fromArray(ibmArray, i * 16);
  const index = new Map(joints.map((j, i) => [j, i]));
  const fingers = joints.filter((j) => FINGER.test(j.getName()));
  if (!fingers.length) return;
  const hand = (j) => {
    let n = j;
    while (n && FINGER.test(n.getName())) n = n.getParentNode();
    return n;
  };

  // the relaxed curl: each finger's rotation at the start of the idle move
  const idle = root.listAnimations().find((a) => a.getName() === "idle");
  const curl = new Map();
  for (const ch of idle?.listChannels() ?? [])
    if (ch.getTargetPath() === "rotation" && FINGER.test(ch.getTargetNode().getName()))
      curl.set(ch.getTargetNode(), q4(ch.getSampler().getOutput().getArray().subarray(0, 4)));

  // where each finger bone goes with that curl, the rest of the body staying in its bind pose
  const bind = new Map(joints.map((j, i) => [j, ibm(i).invert()]));
  const posed = new Map();
  const world = (j) => {
    if (!FINGER.test(j.getName())) return bind.get(j);
    if (posed.has(j)) return posed.get(j);
    const local = new Matrix4().compose(v3(j.getTranslation()), curl.get(j) ?? q4(j.getRotation()), v3(j.getScale()));
    const m = world(j.getParentNode()).clone().multiply(local);
    posed.set(j, m);
    return m;
  };
  const skinning = new Map(
    fingers.map((f) => [
      index.get(f),
      world(f)
        .clone()
        .multiply(ibm(index.get(f))),
    ]),
  );

  for (const mesh of root.listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      const nor = prim.getAttribute("NORMAL");
      const sets = prim.listSemantics().filter((s) => s.startsWith("JOINTS_"));
      const j = [];
      const w = [];
      const p = [];
      const n = [];
      for (let v = 0; v < pos.getCount(); v++) {
        let moved = false;
        const sumP = new Vector3();
        const sumN = new Vector3();
        let rest = 0;
        for (const s of sets) {
          prim.getAttribute(s).getElement(v, j);
          prim.getAttribute(s.replace("JOINTS", "WEIGHTS")).getElement(v, w);
          for (let k = 0; k < 4; k++) {
            const m = skinning.get(j[k]);
            if (!m || !w[k]) {
              rest += w[k];
              continue;
            }
            moved = true;
            pos.getElement(v, p);
            sumP.addScaledVector(v3(p).applyMatrix4(m), w[k]);
            if (nor) {
              nor.getElement(v, n);
              sumN.addScaledVector(v3(n).transformDirection(m), w[k]);
            }
          }
        }
        if (moved) {
          pos.getElement(v, p);
          sumP.addScaledVector(v3(p), rest);
          pos.setElement(v, sumP.toArray());
          if (nor) {
            nor.getElement(v, n);
            nor.setElement(v, sumN.addScaledVector(v3(n), rest).normalize().toArray());
          }
        }
        // finger weights go to the hand
        for (const s of sets) {
          const acc = prim.getAttribute(s);
          acc.getElement(v, j);
          for (let k = 0; k < 4; k++) if (skinning.has(j[k])) j[k] = index.get(hand(joints[j[k]]));
          acc.setElement(v, j);
        }
      }
    }

  // a new skin without them, and every joint index renumbered
  const kept = joints.filter((jt) => !FINGER.test(jt.getName()));
  const renumber = new Map(kept.map((jt, i) => [index.get(jt), i]));
  for (const mesh of root.listMeshes())
    for (const prim of mesh.listPrimitives())
      for (const s of prim.listSemantics().filter((x) => x.startsWith("JOINTS_"))) {
        const acc = prim.getAttribute(s);
        const a = acc.getArray();
        for (let i = 0; i < a.length; i++) a[i] = renumber.get(a[i]) ?? 0;
        acc.setArray(a);
      }
  const matrices = new Float32Array(kept.length * 16);
  kept.forEach((jt, i) => matrices.set(ibmArray.subarray(index.get(jt) * 16, index.get(jt) * 16 + 16), i * 16));
  skin.getInverseBindMatrices().setArray(matrices);
  joints.forEach((jt) => skin.removeJoint(jt));
  kept.forEach((jt) => skin.addJoint(jt));
  for (const a of root.listAnimations())
    for (const ch of a.listChannels())
      if (FINGER.test(ch.getTargetNode()?.getName() ?? "")) {
        a.removeChannel(ch);
        a.removeSampler(ch.getSampler());
        ch.dispose();
      }
  for (const f of fingers) f.dispose();
}

// ——— textures ———

async function sizeTextures(doc, sizes) {
  const want = new Map();
  const note = (tex, size) => tex && want.set(tex, Math.max(want.get(tex) ?? 0, size));
  for (const m of doc.getRoot().listMaterials()) {
    const s = sizes[m.getExtras()?.kind ?? "cloth"] ?? 512;
    note(m.getBaseColorTexture(), s);
    note(m.getNormalTexture(), s);
    note(m.getMetallicRoughnessTexture(), s / 2);
    note(m.getEmissiveTexture(), s / 2);
  }
  doc.createExtension(EXTTextureWebP).setRequired(true);
  for (const [tex, size] of want) {
    const [w, h] = tex.getSize() ?? [size, size];
    const normal = doc
      .getRoot()
      .listMaterials()
      .some((m) => m.getNormalTexture() === tex);
    await compressTexture(tex, {
      encoder: sharp,
      targetFormat: "webp",
      resize: [Math.min(w, size), Math.min(h, size)],
      quality: normal ? 90 : 82,
    });
  }
}

function report(name, doc, file, info) {
  const root = doc.getRoot();
  const prims = root.listMeshes().flatMap((m) => m.listPrimitives());
  const tris = prims.reduce((s, p) => s + (p.getIndices()?.getCount() ?? 0) / 3, 0);
  const bones = root.listSkins()[0]?.listJoints().length;
  const tex = root
    .listTextures()
    .map((t) => t.getSize()?.[0])
    .sort((a, b) => b - a);
  const morphs = prims[0]?.listTargets().length ?? 0;
  console.log(
    `${name.padEnd(12)} ${(statSync(file).size / 1e6).toFixed(2)} MB  ${Math.round(tris)} tris  ${prims.length} draws  ${bones} bones  ` +
      `textures ${tex.join(",")}  morphs ${morphs}  ${info.rig} h=${info.height} hips=${info.hips}  ` +
      `walk ${info.clips.walk?.speed} jog ${info.clips.jog?.speed} run ${info.clips.run?.speed} m/s`,
  );
  console.log(
    `             materials: ${root
      .listMaterials()
      .map((m) => `${m.getName()}(${m.getExtras().kind})`)
      .join(", ")}`,
  );
}

await main();
