// Builds the realistic cars and jeepneys for the "Where's Mark?" walk. It reads the downloaded models in
// assets/vehicles/ (git-ignored: the originals are large) and writes a compressed GLB for each, plus a
// "-lite" one for phones, to public/models/cars/. Each comes out in metres, front to +z, standing on the
// ground at the origin; each wheel on a node of its own at its hub (so the page can spin and steer it);
// plain-coloured parts merged into a few vertex-coloured meshes; and the model's credit, seats and
// camera views in the scene's extras.
//
//   node scripts/build-vehicles.mjs
//
// Both models are CC BY 4.0: the page credits them (the credit is read from each file, not typed in).

import { statSync } from "node:fs";
import { join as joinPath } from "node:path";
import { fileURLToPath } from "node:url";
import { Logger, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTTextureWebP } from "@gltf-transform/extensions";
import {
  compactPrimitive,
  compressTexture,
  dedup,
  joinPrimitives,
  meshopt,
  prune,
  simplifyPrimitive,
  weld,
} from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { Box3, BufferAttribute, BufferGeometry, Matrix3, Matrix4, Vector3 } from "three";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = joinPath(ROOT, "assets", "vehicles");
const OUT = joinPath(ROOT, "public", "models", "cars");

/**
 * - `length`: metres nose to tail (null: the model is in metres already)
 * - `drop`: nodes to leave out (badges, stray planes)
 * - `wheelParts`: nodes holding all four wheels' parts in one mesh, split here by corner
 * - `wheelGroups`: or, ancestors that each hold one wheel
 * - `kinds`: material names → paint (recoloured per vehicle), glass, brakelight, headlight; anything else
 *   is merged by colour into "matte" or "metal" (or kept as it is, if it has a texture)
 * - `seats`: where people sit, in the original model's frame (y = the seat's top; ry = the way they face)
 * - `views`: where your eyes are when you ride, in the same frame, and which way you look first
 * - `triangles`: budgets for the full and lite files
 */
const MODELS = {
  car: {
    src: "car.glb",
    length: 4.45,
    drop: /^(logo|logo001|Text001|base)$/, // the Opel badges and lettering, and a stray ground plane
    wheelParts: /^(Object051|Object_56|gum025|Plane019)$/, // rims, tyres, discs and wheel faces, all four
    kinds: [
      [/^bodypaint$/, "paint"],
      [/^(glass|windshilds)$/, "glass"],
      [/^red_glass$/, "brakelight"],
      [/^rubber_masks$/, "matte"], // the tyres (and seals) come flagged as metal
    ],
    interior: false,
    triangles: [45000, 22000],
  },
  jeepney: {
    src: "jeepney.glb",
    length: null,
    wheelGroups: /\| (Front|Rear) (driver|passenger)-side wheel/,
    kinds: [
      [/^Body_enamel/, "paint"],
      [/windscreen/i, "glass"],
      [/^Ruby_stop_lamp$/, "brakelight"],
      [/headlamp|reflector_facets/i, "headlight"],
    ],
    interior: true,
    // a right-hand-drive model: the wheel (and the driver) on its right (-x)
    seats: [
      { x: -0.45, y: 1.02, z: 0.61, ry: 0, driver: true },
      { x: 0.7, y: 1.04, z: -0.6, ry: -Math.PI / 2 },
      { x: -0.7, y: 1.04, z: -1.0, ry: Math.PI / 2 },
      { x: 0.7, y: 1.04, z: -1.7, ry: -Math.PI / 2 },
      { x: -0.7, y: 1.04, z: -0.2, ry: Math.PI / 2 },
      { x: 0.7, y: 1.04, z: -2.35, ry: -Math.PI / 2 },
    ],
    views: {
      // the right-hand bench near the back, looking across and ahead
      passenger: { x: -0.62, y: 1.78, z: -2.3, look: 0.45 },
      // the front seat beside the driver, looking out through the windscreen
      front: { x: 0.35, y: 1.76, z: 0.6, look: 0 },
    },
    triangles: [60000, 30000],
  },
};

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const quiet = new Logger(Logger.Verbosity.WARN);
const io = new NodeIO()
  .setLogger(quiet)
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const v3 = (a) => new Vector3(a[0], a[1], a[2]);

for (const [id, cfg] of Object.entries(MODELS)) {
  if (process.argv.length > 2 && !process.argv.includes(id)) continue;
  for (const lite of [false, true]) await build(id, cfg, lite);
}

async function build(id, cfg, lite) {
  const doc = await io.read(joinPath(SRC, cfg.src));
  doc.setLogger(quiet);
  const root = doc.getRoot();
  const buffer = root.listBuffers()[0];
  const credit = root.getAsset().extras ?? {};

  // ---- every part baked into the model's frame, tagged with its wheel (if it's part of one) and kind
  const world = (n) => {
    const chain = [];
    for (let x = n; x; x = x.getParentNode()) chain.unshift(x);
    const m = new Matrix4();
    for (const x of chain) m.multiply(new Matrix4().fromArray(x.getMatrix()));
    return m;
  };
  const named = (n, re) => {
    for (let x = n; x; x = x.getParentNode()) if (re.test(x.getName())) return x;
    return null;
  };
  const parts = [];
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh || (cfg.drop && named(node, cfg.drop))) continue;
    const m = world(node);
    const n = new Matrix3().getNormalMatrix(m);
    const group = cfg.wheelGroups ? named(node, cfg.wheelGroups) : null;
    const split = cfg.wheelParts ? !!named(node, cfg.wheelParts) : false;
    for (const prim of mesh.listPrimitives()) {
      const p = bake(doc, prim, m, n, buffer);
      parts.push({ prim: p, material: prim.getMaterial(), group: group?.getName() ?? null, split });
    }
  }
  // the originals go: the new parts are re-assembled below
  for (const n of root.listNodes()) n.dispose();
  for (const m of root.listMeshes()) m.dispose();

  // ---- to metres, front to +z, standing on the ground at the origin
  const box = new Box3();
  for (const { prim } of parts) box.union(bounds(prim));
  const size = box.getSize(new Vector3());
  const scale = cfg.length ? cfg.length / size.z : 1;
  const centre = box.getCenter(new Vector3());
  const place = new Matrix4()
    .makeScale(scale, scale, scale)
    .multiply(new Matrix4().makeTranslation(-centre.x, -box.min.y, -centre.z));
  for (const { prim } of parts) transform(prim, place, null);
  const toModel = (p) => new Vector3(p.x, p.y, p.z).applyMatrix4(place);

  const total = parts.reduce((s, p) => s + triangles(p.prim), 0);

  // ---- wheels: one node each, at its hub
  const wheels = new Map(); // key → parts
  const corner = (c) => (c.z > 0 ? "F" : "R") + (c.x > 0 ? "L" : "R");
  const body = [];
  for (const part of parts) {
    if (part.split) {
      for (const [key, prim] of splitByCorner(doc, part.prim, buffer, corner))
        (wheels.get(key) ?? wheels.set(key, []).get(key)).push({ ...part, prim });
      part.prim.dispose();
    } else if (part.group) {
      const key = corner(bounds(part.prim).getCenter(new Vector3()));
      (wheels.get(key) ?? wheels.set(key, []).get(key)).push(part);
    } else body.push(part);
  }

  const scene = root.listScenes()[0];
  const model = doc.createNode(id);
  scene.addChild(model);
  const materials = new Map();
  const budget = cfg.triangles[lite ? 1 : 0];
  const ratio = Math.min(1, budget / Math.max(total, 1));

  const bodyMesh = doc.createMesh("body");
  for (const prim of assemble(doc, body, cfg, materials, buffer)) bodyMesh.addPrimitive(prim);
  model.addChild(doc.createNode("body").setMesh(bodyMesh));

  const wheelInfo = [];
  for (const [key, list] of [...wheels].sort()) {
    const b = new Box3();
    for (const { prim } of list) b.union(bounds(prim));
    const hub = b.getCenter(new Vector3());
    const s = b.getSize(new Vector3());
    for (const { prim } of list) transform(prim, new Matrix4().makeTranslation(-hub.x, -hub.y, -hub.z), null);
    const mesh = doc.createMesh(`wheel-${key}`);
    for (const prim of assemble(doc, list, cfg, materials, buffer)) mesh.addPrimitive(prim);
    model.addChild(doc.createNode(`wheel-${key}`).setMesh(mesh).setTranslation(hub.toArray()));
    wheelInfo.push({ node: `wheel-${key}`, front: key[0] === "F", radius: +(Math.max(s.y, s.z) / 2).toFixed(3) });
  }

  // ---- lighter: welded, then simplified to the budget (small parts left alone)
  await doc.transform(dedup(), weld());
  // (wheels are small and dense, and seen in motion: they take a coarser error)
  for (const mesh of root.listMeshes()) {
    const wheel = mesh.getName().startsWith("wheel-");
    const error = (lite ? 0.012 : 0.005) * (wheel ? 3 : 1);
    for (const prim of mesh.listPrimitives()) {
      if (ratio < 1 && triangles(prim) > 1500) simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio, error });
      // a tread of hundreds of separate blocks won't simplify that way: by shape instead, smooth normals after
      const target = lite ? 900 : 1800;
      if (wheel && triangles(prim) > target * 1.5) {
        prim.setAttribute("NORMAL", null);
        sloppy(doc, prim, buffer, target);
        smoothNormals(doc, prim, buffer);
      }
    }
  }
  await doc.transform(prune());

  const r2 = (v) => +v.toFixed(3);
  const info = {
    kind: id === "jeepney" ? "jeepney" : "car",
    length: r2(size.z * scale),
    width: r2(size.x * scale),
    height: r2(size.y * scale),
    wheels: wheelInfo,
    interior: cfg.interior,
    seats: (cfg.seats ?? []).map((s) => {
      const p = toModel(s);
      return { x: r2(p.x), y: r2(p.y), z: r2(p.z), ry: r2(s.ry), driver: !!s.driver };
    }),
    views: cfg.views
      ? Object.fromEntries(
          Object.entries(cfg.views).map(([k, v]) => {
            const p = toModel(v);
            return [k, { x: r2(p.x), y: r2(p.y), z: r2(p.z), look: v.look }];
          }),
        )
      : null,
    credit: { title: credit.title, author: credit.author, license: credit.license, source: credit.source },
  };
  scene.setExtras({ vehicle: info });

  // ---- textures, then compression
  doc.createExtension(EXTTextureWebP).setRequired(true);
  for (const tex of root.listTextures()) {
    const [w, h] = tex.getSize() ?? [1024, 1024];
    const max = lite ? 512 : 1024;
    await compressTexture(tex, {
      encoder: sharp,
      targetFormat: "webp",
      resize: [Math.min(w, max), Math.min(h, max)],
      quality: 82,
    });
  }
  await doc.transform(prune(), dedup(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const file = joinPath(OUT, `${id}${lite ? "-lite" : ""}.glb`);
  await io.write(file, doc);

  const prims = root.listMeshes().flatMap((m) => m.listPrimitives());
  console.log(
    `${(id + (lite ? "-lite" : "")).padEnd(13)} ${(statSync(file).size / 1e6).toFixed(2)} MB  ` +
      `${Math.round(prims.reduce((s, p) => s + triangles(p), 0))} tris (from ${Math.round(total)})  ${prims.length} draws  ` +
      `${info.length}×${info.width}×${info.height} m  wheels ${wheelInfo.map((w) => `${w.node.slice(6)}:${w.radius}`).join(" ")}`,
  );
  if (!lite)
    console.log(
      `              materials: ${[...new Set(prims.map((p) => `${p.getMaterial().getName()}`))].join(", ")}\n` +
        `              credit: ${info.credit.title} by ${info.credit.author}, ${info.credit.license}`,
    );
}

// ——— geometry helpers ———

function triangles(prim) {
  const idx = prim.getIndices();
  return (idx ? idx.getCount() : prim.getAttribute("POSITION").getCount()) / 3;
}

function bounds(prim) {
  const pos = prim.getAttribute("POSITION");
  const b = new Box3();
  const e = [];
  for (let i = 0; i < pos.getCount(); i++) b.expandByPoint(v3(pos.getElement(i, e)));
  return b;
}

/** A copy of a primitive with its positions and normals moved into the model's frame (float, unquantized). */
function bake(doc, prim, m, n, buffer) {
  const out = doc.createPrimitive().setMode(prim.getMode());
  const idx = prim.getIndices();
  if (idx)
    out.setIndices(doc.createAccessor().setType("SCALAR").setArray(Uint32Array.from(idx.getArray())).setBuffer(buffer));
  for (const semantic of ["POSITION", "NORMAL", "TEXCOORD_0"]) {
    const a = prim.getAttribute(semantic);
    if (!a) continue;
    const size = a.getElementSize();
    const arr = new Float32Array(a.getCount() * size);
    const e = [];
    for (let i = 0; i < a.getCount(); i++) arr.set(a.getElement(i, e), i * size);
    out.setAttribute(semantic, doc.createAccessor().setType(a.getType()).setArray(arr).setBuffer(buffer));
  }
  transform(out, m, n);
  return out;
}

function transform(prim, m, n) {
  const pos = prim.getAttribute("POSITION").getArray();
  const v = new Vector3();
  for (let i = 0; i < pos.length; i += 3) v.fromArray(pos, i).applyMatrix4(m).toArray(pos, i);
  const nor = prim.getAttribute("NORMAL")?.getArray();
  if (nor && n) for (let i = 0; i < nor.length; i += 3) v.fromArray(nor, i).applyMatrix3(n).normalize().toArray(nor, i);
}

/** Simplifies to about `target` triangles whatever the topology (separate pieces merge on a grid). */
function sloppy(doc, prim, buffer, target) {
  const idx = prim.getIndices().getArray();
  if (idx.length / 3 <= target) return;
  const pos = prim.getAttribute("POSITION").getArray();
  const [out] = MeshoptSimplifier.simplifySloppy(
    Uint32Array.from(idx),
    Float32Array.from(pos),
    3,
    null,
    target * 3,
    0.05,
  );
  prim.setIndices(doc.createAccessor().setType("SCALAR").setArray(out).setBuffer(buffer));
  compactPrimitive(prim);
}

function smoothNormals(doc, prim, buffer) {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(prim.getAttribute("POSITION").getArray(), 3));
  g.setIndex(new BufferAttribute(prim.getIndices().getArray(), 1));
  g.computeVertexNormals();
  prim.setAttribute(
    "NORMAL",
    doc.createAccessor().setType("VEC3").setArray(g.getAttribute("normal").array).setBuffer(buffer),
  );
}

/** Splits a primitive holding all four wheels into one per corner, by where each triangle is. */
function splitByCorner(doc, prim, buffer, corner) {
  const pos = prim.getAttribute("POSITION").getArray();
  const idx = prim.getIndices()?.getArray() ?? Uint32Array.from({ length: pos.length / 3 }, (_, i) => i);
  const sets = new Map();
  const c = new Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) c.add(new Vector3().fromArray(pos, idx[t + k] * 3));
    const key = corner(c.divideScalar(3));
    (sets.get(key) ?? sets.set(key, []).get(key)).push(idx[t], idx[t + 1], idx[t + 2]);
  }
  const out = new Map();
  for (const [key, list] of sets) {
    const p = prim
      .clone()
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(Uint32Array.from(list)).setBuffer(buffer));
    compactPrimitive(p);
    out.set(key, p);
  }
  return out;
}

// ——— materials ———

/**
 * What a part is made of. Named kinds come from the config; the rest by look: textured parts keep their
 * own material, plain metal and plain everything else are merged (their colour moves into the vertices).
 */
function kindOf(cfg, material) {
  const name = material?.getName() ?? "";
  for (const [re, kind] of cfg.kinds) if (re.test(name)) return kind;
  if (material?.getBaseColorTexture()) return `textured:${name}`;
  return (material?.getMetallicFactor() ?? 0) >= 0.5 ? "metal" : "matte";
}

/** Joins a set of parts into one primitive per kind, each with a material made for that kind. */
function assemble(doc, list, cfg, materials, buffer) {
  const byKind = new Map();
  for (const part of list) {
    const kind = kindOf(cfg, part.material);
    (byKind.get(kind) ?? byKind.set(kind, []).get(kind)).push(part);
  }
  const out = [];
  for (const [kind, parts] of byKind) {
    const textured = kind.startsWith("textured:");
    const coloured = kind === "matte" || kind === "metal";
    for (const { prim, material } of parts) {
      if (!prim.getIndices()) {
        const n = prim.getAttribute("POSITION").getCount();
        prim.setIndices(
          doc
            .createAccessor()
            .setType("SCALAR")
            .setArray(Uint32Array.from({ length: n }, (_, i) => i))
            .setBuffer(buffer),
        );
      }
      if (!textured) prim.setAttribute("TEXCOORD_0", null);
      if (coloured) {
        const c = material?.getBaseColorFactor() ?? [0.6, 0.6, 0.6, 1];
        const n = prim.getAttribute("POSITION").getCount();
        const colors = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) colors.set([c[0], c[1], c[2]], i * 3);
        prim.setAttribute("COLOR_0", doc.createAccessor().setType("VEC3").setArray(colors).setBuffer(buffer));
      }
    }
    const usable = parts.filter((p) => !textured || p.prim.getAttribute("TEXCOORD_0"));
    if (!usable.length) continue;
    const joined = usable.length > 1 ? joinPrimitives(usable.map((p) => p.prim)) : usable[0].prim;
    joined.setMaterial(materialFor(doc, kind, parts, materials));
    out.push(joined);
  }
  return out;
}

function materialFor(doc, kind, parts, materials) {
  if (materials.has(kind)) return materials.get(kind);
  const first = parts[0].material;
  let m;
  if (kind.startsWith("textured:")) m = first.clone().setName(kind.slice(9));
  else {
    const avg = (get) => parts.reduce((s, p) => s + (p.material ? get(p.material) : 0.5), 0) / parts.length;
    m = doc
      .createMaterial(kind)
      .setBaseColorFactor(
        kind === "matte" || kind === "metal" ? [1, 1, 1, 1] : (first?.getBaseColorFactor() ?? [1, 1, 1, 1]),
      )
      .setRoughnessFactor(avg((x) => x.getRoughnessFactor()))
      .setMetallicFactor(kind === "metal" ? 1 : 0);
  }
  m.setExtras({ kind: kind.startsWith("textured:") ? "textured" : kind });
  materials.set(kind, m);
  return m;
}
