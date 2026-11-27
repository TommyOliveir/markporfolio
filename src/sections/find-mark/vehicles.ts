// The realistic cars and jeepneys: loads the models built by scripts/build-vehicles.mjs (in
// public/models/cars), dresses their materials (clear-coated paint, tinted glass, chrome, lamps) and
// hands out one body for each vehicle on the road, in its own colour. Each wheel is a node at its hub,
// so Traffic can spin and steer it; the brake lights are each vehicle's own, so they light up alone.
// Tricycles stay painted for now (no freely licensed model yet).

import { MeshPhysicalMaterial, MeshStandardMaterial, type Group, type Material, type Mesh, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { environment } from "./humans";

export type VehicleKind = "car" | "jeepney";

/** Where someone sits (y = the seat's top) and the way they face, in the vehicle's frame (+x = its left). */
export type VehicleSeat = { x: number; y: number; z: number; ry: number; driver: boolean };
/** Where your eyes are when you ride, and which way you look first (0 = ahead). */
export type VehicleView = { x: number; y: number; z: number; look: number };

export type VehicleInfo = {
  kind: VehicleKind;
  length: number;
  wheels: { node: string; front: boolean; radius: number }[];
  /** has seats inside to ride on (otherwise riding shows the painted cabin) */
  interior: boolean;
  seats: VehicleSeat[];
  views: Record<"passenger" | "front", VehicleView> | null;
};

/** One vehicle's realistic body. */
export type Body = {
  group: Group;
  info: VehicleInfo;
  wheels: { node: Object3D; radius: number; front: boolean }[];
  brake: MeshStandardMaterial | null;
  dispose(): void;
};

/** CC BY 4.0: credited on the page (scripts/build-vehicles.mjs prints these from the files). */
export const VEHICLE_CREDITS = [
  {
    title: "OPEL Astra GTC 2012",
    author: "Comrade1280",
    source: "https://sketchfab.com/3d-models/opel-astra-gtc-2012-d76ad5a0495443eda24a9052565ef9a8",
  },
  {
    title: "Jeepney (BiyaheLink)",
    author: "lancemd15",
    source: "https://sketchfab.com/3d-models/jeepney-biyahelink-a4c013d97b9c413d9d4c9a8c89db9520",
  },
];
export const VEHICLE_LICENSE = { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" };

type Template = { scene: Group; info: VehicleInfo };

export class Vehicles {
  private paints = new Map<string, MeshPhysicalMaterial>();

  constructor(private templates: Map<VehicleKind, Template>) {}

  has(kind: string): kind is VehicleKind {
    return this.templates.has(kind as VehicleKind);
  }

  /** A body for one vehicle, painted `color`. Geometry and most materials are shared with the others. */
  make(kind: VehicleKind, color: string): Body | null {
    const t = this.templates.get(kind);
    if (!t) return null;
    const group = t.scene.clone(true);
    let brake: MeshStandardMaterial | null = null;
    group.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const m = mesh.material as MeshStandardMaterial;
      if (m.userData.kind === "paint") mesh.material = this.paint(kind, m, color);
      else if (m.userData.kind === "brakelight") mesh.material = brake ??= m.clone();
    });
    const wheels = t.info.wheels.flatMap((w) => {
      const node = group.getObjectByName(w.node);
      if (!node) return [];
      node.rotation.order = "YXZ"; // steer (y) the spinning (x) wheel
      return [{ node, radius: w.radius, front: w.front }];
    });
    return { group, info: t.info, wheels, brake, dispose: () => (brake as Material | null)?.dispose() };
  }

  /** Clear-coated paint in one colour, shared by every vehicle of that kind and colour. */
  private paint(kind: VehicleKind, base: MeshStandardMaterial, color: string) {
    const key = `${kind}|${color}`;
    let p = this.paints.get(key);
    if (!p) {
      p = new MeshPhysicalMaterial();
      MeshStandardMaterial.prototype.copy.call(p, base);
      p.defines = { STANDARD: "", PHYSICAL: "" };
      p.color.set(color);
      p.metalness = kind === "car" ? 0.45 : 0.15; // a jeepney's enamel is plainer than a car's metallic paint
      p.roughness = kind === "car" ? 0.38 : 0.45;
      p.clearcoat = 1;
      p.clearcoatRoughness = 0.07;
      p.envMap = environment();
      p.envMapIntensity = 1;
      p.userData = base.userData;
      this.paints.set(key, p);
    }
    return p;
  }
}

/** Glass, chrome, lamps and the rest, tuned once per model. Only the body casts a shadow. */
function prepare(scene: Object3D, kind: VehicleKind) {
  scene.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const m = mesh.material as MeshStandardMaterial;
    const wheel = mesh.parent?.name.startsWith("wheel-") ?? false;
    m.envMap = environment();
    m.envMapIntensity = 0.8;
    mesh.receiveShadow = true;
    mesh.castShadow = !wheel && (m.userData.kind === "paint" || m.userData.kind === "matte");
    switch (m.userData.kind) {
      case "glass":
        // tinted, as most cars in Iloilo are; a jeepney's windscreen only lightly
        m.transparent = true;
        m.depthWrite = false;
        m.forceSinglePass = true;
        m.color.set(kind === "car" ? "#141a20" : "#d6e6ec");
        m.opacity = kind === "car" ? 0.86 : 0.3;
        m.roughness = 0.04;
        m.metalness = 0.2;
        m.envMapIntensity = 1.5;
        break;
      case "brakelight":
        m.color.set("#4a0a08");
        m.emissive.set("#ff2a18");
        m.emissiveIntensity = 0.25;
        break;
      case "headlight":
        m.emissive.set("#fff3d6");
        m.emissiveIntensity = 0.3;
        break;
      case "metal":
        m.roughness = Math.min(m.roughness, 0.3);
        m.envMapIntensity = 1.2;
        break;
    }
  });
}

const loading = new Map<boolean, Promise<Vehicles>>();

/** Loads the vehicles once per kind of device; the walk and its preview share them. */
export function loadVehicles(lite: boolean) {
  let p = loading.get(lite);
  if (!p) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    p = Promise.all(
      (["car", "jeepney"] as const).map(async (kind) => {
        const gltf = await loader.loadAsync(`/models/cars/${kind}${lite ? "-lite" : ""}.glb`);
        const info = gltf.scene.userData.vehicle as VehicleInfo;
        prepare(gltf.scene, kind);
        return [kind, { scene: gltf.scene, info }] as const;
      }),
    ).then((list) => new Vehicles(new Map(list)));
    p.catch(() => loading.delete(lite));
    loading.set(lite, p);
  }
  return p;
}
