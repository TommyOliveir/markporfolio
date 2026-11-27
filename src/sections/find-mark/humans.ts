// The realistic townsfolk: loads the character models built by scripts/build-people.mjs (in
// public/models/people), tunes their materials (skin, hair, eyes, cloth) and hands out figures (Rig) for
// the walk to put its people into. Each model already carries every move, retargeted to its skeleton.
//
// The models: the player is Mixamo's "AJ"; Mark and two of the men are from Ara 3D Gen (with facial
// blendshapes, and clothes in separate pieces, so they can be recoloured); the rest are Mixamo's.

import {
  CubeTexture,
  DoubleSide,
  MeshDepthMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Material,
  type SkinnedMesh,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { Rig, type Template } from "./rig";

export type ModelId = "player" | "mark" | "man-1" | "man-2" | "man-3" | "woman-1" | "woman-2" | "woman-3";

type Model = {
  /** how tall the figure stands, in metres */
  height: number;
  /** seen close up: a full-detail file, plus a "-lite" one for phones */
  hero?: boolean;
  woman?: boolean;
  /** clothes that take a figure's colours (material name → which colour) */
  tint?: Record<string, "shirt" | "pants">;
};

export const MODELS: Record<ModelId, Model> = {
  player: { height: 1.74, hero: true },
  mark: { height: 1.74, hero: true },
  "man-1": { height: 1.72, tint: { "Singlet rib-knit cotton": "shirt", "Loose shorts fabric": "pants" } }, // singlet and shorts
  "man-2": { height: 1.72 },
  "man-3": { height: 1.68, tint: { Outfit: "pants" } }, // an older man in a suit and fedora
  "woman-1": { height: 1.6, woman: true },
  "woman-2": { height: 1.58, woman: true },
  "woman-3": { height: 1.62, woman: true },
};

/** Phones and the preview window load fewer, smaller files. */
const LITE: ModelId[] = ["player", "mark", "man-2", "man-3", "woman-2", "woman-3"];

/** The models that can march in the band: their clothes take the uniform's colours. */
const BAND: ModelId[] = ["man-1", "man-3"];

export type Dress = { shirt?: string; pants?: string; indoor?: boolean };

export class Humans {
  private variants = new Map<string, Material>();

  constructor(
    private templates: Map<ModelId, Template>,
    readonly lite: boolean,
  ) {}

  has(id: ModelId) {
    return this.templates.has(id);
  }

  /** A model for a townsperson: women in skirts, anyone else from the whole crowd. */
  crowd(rand: () => number, woman: boolean | null): ModelId {
    const ids = [...this.templates.keys()].filter(
      (id) => id !== "player" && id !== "mark" && (woman === null || !!MODELS[id].woman === woman),
    );
    return ids[Math.floor(rand() * ids.length) % ids.length] ?? "man-2";
  }

  bandsman(rand: () => number): ModelId {
    const ids = BAND.filter((id) => this.templates.has(id));
    return ids.length ? ids[Math.floor(rand() * ids.length) % ids.length] : this.crowd(rand, false);
  }

  make(id: ModelId, dress: Dress = {}) {
    const template = this.templates.get(id) ?? this.templates.get("man-2") ?? [...this.templates.values()][0];
    const tint = MODELS[template.id as ModelId].tint;
    const swap =
      dress.indoor || (tint && (dress.shirt || dress.pants))
        ? (m: Material) =>
            this.variant(template.id, m, tint?.[m.name] ? dress[tint[m.name]] : undefined, !!dress.indoor)
        : undefined;
    return new Rig(template, swap);
  }

  /** A recoloured (and/or indoor) copy of a material, shared by everyone dressed the same. */
  private variant(id: string, m: Material, color: string | undefined, indoor: boolean) {
    const key = `${id}|${m.uuid}|${color ?? ""}|${indoor}`;
    let v = this.variants.get(key);
    if (!v) {
      const c = m.clone() as MeshStandardMaterial;
      if (color) recolor(c, color);
      if (indoor) {
        // the church's inside is lit by a warm fill rather than the sun
        c.emissive.set("#2a241c");
        c.emissiveIntensity = 1;
      }
      v = c;
      this.variants.set(key, v);
    }
    return v;
  }
}

/**
 * Takes the colour out of a cloth texture (keeping its weave, folds and seams) and dyes it `color`.
 * The texture's own brightness is evened out, so pale and dark fabrics end up the colour asked for.
 */
function recolor(m: MeshStandardMaterial, color: string) {
  const gain = m.map ? 0.55 / Math.max(averageLuma(m.map.image as CanvasImageSource), 0.04) : 1;
  m.color.set(color);
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      /* glsl */ `
      #ifdef USE_MAP
        vec4 texel = texture2D( map, vMapUv );
        float l = dot( texel.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) * ${gain.toFixed(3)};
        diffuseColor.rgb *= clamp( l, 0.0, 1.6 );
        diffuseColor.a *= texel.a;
      #endif`,
    );
  };
  m.customProgramCacheKey = () => `recolor-${gain.toFixed(3)}`;
}

/** The average linear brightness of an image, from a tiny copy of it. */
function averageLuma(image: CanvasImageSource) {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(image, 0, 0, 16, 16);
    const d = g.getImageData(0, 0, 16, 16).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) {
      const lin = (v: number) => Math.pow(v / 255, 2.2);
      sum += 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    }
    return sum / (d.length / 4);
  } catch {
    return 0.3;
  }
}

/**
 * The afternoon around Molo as an environment map: blue sky overhead, a warm hazy horizon, sunlit
 * paving below. Only the people use it (the painted town is lit as before), so their skin, hair and
 * clothes catch light from all round instead of looking flat. Six small painted canvases; three turns
 * them into a prefiltered map for each renderer by itself.
 */
let env: CubeTexture | null = null;
function environment() {
  if (env) return env;
  const face = (stops: [number, string][]) => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const g = c.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 0, 32);
    for (const [at, colour] of stops) grad.addColorStop(at, colour);
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    return c;
  };
  const side = face([
    [0, "#a9cdee"],
    [0.42, "#e8e4da"],
    [0.5, "#f4dcc0"],
    [0.56, "#c9a57a"],
    [1, "#8a7356"],
  ]);
  const up = face([
    [0, "#9cc4ec"],
    [1, "#9cc4ec"],
  ]);
  const down = face([
    [0, "#9a8162"],
    [1, "#9a8162"],
  ]);
  env = new CubeTexture([side, side, up, down, side, side]);
  env.colorSpace = SRGBColorSpace;
  env.needsUpdate = true;
  return env;
}

/**
 * The people's shadows are drawn with a depth material of their own. three.js otherwise draws every
 * shadow with one shared material, and switching it between skinned figures and the (unskinned) town
 * makes it re-prepare its shader on nearly every switch, every frame.
 */
const skinnedDepth = new MeshDepthMaterial();

/** Skin, hair, eyes and cloth each want something different from the same exported material. */
function prepare(t: Template, hero: boolean) {
  const replace = new Map<Material, Material>();
  t.scene.traverse((o) => {
    const mesh = o as SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    let m = mesh.material as MeshStandardMaterial;
    const kind = (m.userData.kind as string) ?? "cloth";
    if (hero && kind === "skin") {
      // skin catches a soft sheen at grazing angles, like the fine hairs on real skin
      let p = replace.get(m) as MeshPhysicalMaterial | undefined;
      if (!p) {
        p = new MeshPhysicalMaterial();
        MeshStandardMaterial.prototype.copy.call(p, m);
        p.defines = { STANDARD: "", PHYSICAL: "" };
        p.sheen = 0.35;
        p.sheenRoughness = 0.5;
        p.sheenColor.set("#ffb59a");
        p.ior = 1.4;
        p.specularIntensity = 0.6;
        p.userData = m.userData;
        replace.set(m, p);
      }
      mesh.material = m = p;
    }
    m.envMap = environment();
    m.envMapIntensity = kind === "eyes" ? 1 : 0.45;
    mesh.userData.castsShadow = kind === "skin" || kind === "atlas" || kind === "hat";
    switch (kind) {
      case "hair":
        // cut out rather than blended, so strands never sort wrongly; smoothed where there's MSAA
        m.transparent = false;
        m.alphaTest = 0.42;
        m.alphaToCoverage = true;
        m.depthWrite = true;
        m.side = DoubleSide;
        mesh.userData.castsShadow = false;
        break;
      case "decal":
        m.transparent = true;
        m.forceSinglePass = true; // (double-sided see-through materials are otherwise drawn twice, and re-prepared each time)
        m.depthWrite = false;
        m.polygonOffset = true;
        m.polygonOffsetFactor = -1;
        mesh.userData.castsShadow = false;
        mesh.renderOrder = 1;
        break;
      case "glass":
        m.transparent = true;
        m.forceSinglePass = true;
        m.opacity = 0.6;
        m.roughness = 0.05;
        mesh.userData.castsShadow = false;
        break;
      case "eyes":
      case "inner":
        mesh.userData.castsShadow = false;
        break;
    }
    mesh.castShadow = mesh.userData.castsShadow;
    mesh.receiveShadow = kind !== "decal" && kind !== "glass";
    // bounds from the bind pose, roomy enough for any pose, so figures cull without being re-measured
    mesh.computeBoundingSphere();
    mesh.boundingSphere!.radius *= 1.35;
  });
}

const loading = new Map<boolean, Promise<Humans>>();

/** Loads the people once per kind of device; the walk and its preview share them. */
export function loadHumans(lite: boolean) {
  let p = loading.get(lite);
  if (!p) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const ids = lite ? LITE : (Object.keys(MODELS) as ModelId[]);
    p = Promise.all(
      ids.map(async (id) => {
        const file = `/models/people/${id}${lite && MODELS[id].hero ? "-lite" : ""}.glb`;
        const gltf = await loader.loadAsync(file);
        const info = gltf.scene.userData.people as Template["info"];
        const t: Template = {
          id,
          scene: gltf.scene,
          clips: gltf.animations,
          info,
          scale: MODELS[id].height / info.height,
          depth: skinnedDepth,
        };
        prepare(t, !!MODELS[id].hero);
        return [id, t] as const;
      }),
    ).then((list) => new Humans(new Map(list), lite));
    // a failed load can be tried again next time
    p.catch(() => loading.delete(lite));
    loading.set(lite, p);
  }
  return p;
}
