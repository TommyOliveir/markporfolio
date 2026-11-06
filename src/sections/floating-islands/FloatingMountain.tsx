"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { DoubleSide, MeshStandardMaterial, ShaderMaterial, Vector3, type Group, type Mesh } from "three";
import { seeded } from "@/lib/seeded";
import { buildTree } from "./big-tree";
import { buildCity } from "./city";
import { dressRock } from "./jungle";
import { buildChurch } from "./molo-church";
import { type RockSpec, buildRock } from "./rock";
import { Spin } from "./spin";
import { buildStrawberry } from "./strawberry";
import { buildWaterfall, mistTexture, waterShader } from "./waterfall";

const MAIN: RockSpec = {
  profile: [
    [0.02, -3.4],
    [0.4, -3.0],
    [0.72, -2.4],
    [0.92, -1.6],
    [1.0, -0.8],
    [1.03, 0.0],
    [1.08, 0.7],
    [1.04, 0.98],
    [0.7, 1.07],
    [0.0, 1.1],
  ],
  seed: 3.1,
  rough: 0.38,
};

// Smaller rocks drifting alongside the main mountain.
const SATELLITES: {
  spec: RockSpec;
  at: [number, number, number];
  scale: number;
  phase: number;
  city?: boolean;
  tree?: boolean;
  church?: boolean;
}[] = [
  {
    spec: {
      // broad, flat-topped so a town fits on it
      profile: [
        [0.02, -1.2],
        [0.32, -0.8],
        [0.56, -0.3],
        [0.66, 0.1],
        [0.64, 0.24],
        [0.4, 0.29],
        [0.0, 0.3],
      ],
      seed: 8.4,
      rough: 0.26,
    },
    at: [-4.2, 0.9, -0.6],
    scale: 1.3,
    phase: 1.3,
    city: true,
  },
  {
    spec: {
      // flatter top for the big tree's roots to spread over
      profile: [
        [0.02, -0.9],
        [0.27, -0.6],
        [0.45, -0.2],
        [0.5, 0.08],
        [0.47, 0.2],
        [0.3, 0.24],
        [0.0, 0.25],
      ],
      seed: 15.2,
      rough: 0.3,
    },
    at: [4.0, -0.8, 1.0],
    scale: 1.1,
    phase: 2.6,
    tree: true,
  },
  {
    spec: {
      // broad and flat on top, for the church and its plaza
      profile: [
        [0.02, -1.1],
        [0.34, -0.72],
        [0.58, -0.3],
        [0.7, 0.05],
        [0.7, 0.18],
        [0.62, 0.22],
        [0.0, 0.23],
      ],
      seed: 22.7,
      rough: 0.18,
    },
    at: [2.8, 0.6, -2.8], // low enough that the spires clear the top of the band as it swings past
    scale: 1.35,
    phase: 4.1,
    church: true,
  },
];

function buildScene() {
  const rand = seeded(42);
  const stone = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const bark = new MeshStandardMaterial({ color: "#4e3d2c", roughness: 1 });
  const vine = new MeshStandardMaterial({ color: "#33592a", roughness: 0.9 });

  const mainRock = buildRock(MAIN);
  const main = {
    rock: mainRock,
    ...dressRock(mainRock, MAIN, { size: 1, bushes: 320, edge: 170, trees: 9, vines: 38 }, rand),
  };

  const satellites = SATELLITES.map((s) => {
    const rock = buildRock(s.spec);
    // The city rock keeps its greenery to the rim so the town shows; the others are wild jungle.
    // The big tree's rock gets only low undergrowth around its roots.
    const growth = s.city
      ? { size: 0.6, bushes: 0, edge: 40, trees: 0, vines: 8 }
      : s.tree
        ? { size: 0.6, bushes: 8, edge: 30, trees: 0, vines: 8 }
        : s.church
          ? { size: 0.6, bushes: 0, edge: 0, trees: 0, vines: 7 }
          : { size: 0.6, bushes: 60, edge: 30, trees: 2, vines: 7 };
    return {
      ...s,
      rock,
      town: s.city ? buildCity(rand, 0.25, 0.46) : null,
      bigTree: s.tree ? buildTree(rand, 0.21) : null,
      molo: s.church ? buildChurch(0.23) : null,
      ...dressRock(rock, s.spec, growth, rand),
    };
  });
  const brick = new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const glow = new MeshStandardMaterial({ color: "#ffd27a", emissive: "#ffb347", emissiveIntensity: 1.4 });
  const wood = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });

  // Put the waterfall on the rim point that starts out facing the viewer.
  const pos = mainRock.getAttribute("position");
  const nor = mainRock.getAttribute("normal");
  const lipIndex = main.rims
    .filter((i) => pos.getY(i) > 0.55 && pos.getY(i) < 0.95)
    .reduce((best, i) => (pos.getZ(i) > pos.getZ(best) ? i : best), main.rims[0]);
  const lip = new Vector3().fromBufferAttribute(pos, lipIndex);
  const outward = new Vector3(nor.getX(lipIndex), 0, nor.getZ(lipIndex)).normalize();
  const drop = 4.2;
  const waterfall = {
    geo: buildWaterfall(lip, outward, drop),
    material: new ShaderMaterial({
      ...waterShader,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    }),
    foot: lip
      .clone()
      .addScaledVector(outward, 0.5)
      .setY(lip.y - drop * 0.55),
  };

  const strawberry = buildStrawberry();
  const mist = mistTexture();
  const puffs = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + rand.range(-0.3, 0.3);
    const r = rand.range(0.9, 1.6);
    return {
      at: [Math.cos(a) * r, rand.range(-2.6, -1.2), Math.sin(a) * r] as [number, number, number],
      scale: rand.range(1.6, 2.6),
      opacity: rand.range(0.25, 0.45),
    };
  });

  return { stone, bark, vine, brick, glow, wood, main, satellites, waterfall, strawberry, mist, puffs };
}

/** Extra turn the visitor gives the scene by dragging or swiping, with a little fling momentum. */

// A towering floating mountain wrapped in jungle, with a waterfall pouring off the edge.
export default function FloatingMountain({ spin }: { spin?: Spin }) {
  const scene = useMemo(() => buildScene(), []);
  const root = useRef<Group>(null);
  const drift = useRef(0); // the slow turn it makes on its own
  const sats = useRef<(Group | null)[]>([]);
  const berry = useRef<Group>(null);
  const water = useRef<Mesh>(null);

  useEffect(
    () => () => {
      const { stone, bark, vine, brick, glow, wood, main, satellites, waterfall, strawberry, mist } = scene;
      const berry = strawberry;
      [berry.body, berry.leaves, berry.skin, berry.leaf, berry.seeds.geometry].forEach((x) => x.dispose());
      (berry.seeds.material as MeshStandardMaterial).dispose();
      berry.seeds.dispose();
      [stone, bark, vine, brick, glow, wood, waterfall.material, waterfall.geo, mist].forEach((x) => x.dispose());
      satellites.forEach((s) => {
        s.town?.buildings.dispose();
        s.town?.windows.dispose();
        s.bigTree?.wood.dispose();
        s.bigTree?.canopy.geometry.dispose();
        (s.bigTree?.canopy.material as MeshStandardMaterial | undefined)?.dispose();
        s.bigTree?.canopy.dispose();
        s.molo?.dispose();
      });
      [main, ...satellites].forEach((r) => {
        r.rock.dispose();
        r.trunks?.dispose();
        r.vines?.dispose();
        r.foliage.geometry.dispose();
        (r.foliage.material as MeshStandardMaterial).dispose();
        r.foliage.dispose();
      });
    },
    [scene],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (root.current) {
      drift.current += delta * 0.12;
      root.current.rotation.y = drift.current + (spin?.angle ?? 0);
      root.current.position.y = 0.25 + Math.sin(t * 0.6) * 0.12;
    }
    scene.satellites.forEach((s, i) => {
      const g = sats.current[i];
      if (g) g.position.y = s.at[1] + Math.sin(t * 0.8 + s.phase) * 0.12;
    });
    if (water.current) (water.current.material as ShaderMaterial).uniforms.uTime.value = t;
    if (berry.current) {
      berry.current.rotation.y += delta * 0.35; // turning slowly on its own axis
      berry.current.position.y = Math.sin(t * 0.9 + 0.7) * 0.15; // bobbing, relative to its spot
    }
  });

  const { stone, bark, vine, brick, glow, wood, main, satellites, waterfall, strawberry, mist, puffs } = scene;

  return (
    <group ref={root} scale={1.3}>
      <mesh geometry={main.rock} material={stone} castShadow receiveShadow />
      <primitive object={main.foliage} />
      {main.trunks && <mesh geometry={main.trunks} material={bark} castShadow />}
      {main.vines && <mesh geometry={main.vines} material={vine} />}

      <mesh ref={water} geometry={waterfall.geo} material={waterfall.material} renderOrder={2} />
      <Sparkles
        position={waterfall.foot}
        count={30}
        scale={[0.7, 0.9, 0.7]}
        size={3}
        speed={0.5}
        opacity={0.7}
        color="#ffffff"
      />

      {puffs.map((p, i) => (
        <sprite key={i} position={p.at} scale={p.scale} renderOrder={3}>
          <spriteMaterial map={mist} transparent opacity={p.opacity} depthWrite={false} />
        </sprite>
      ))}

      {satellites.map((s, i) => (
        <group
          key={i}
          ref={(el) => {
            sats.current[i] = el;
          }}
          position={s.at}
          // The church's facade points away from the centre of the orbit, so it faces the
          // viewer whenever it swings round to the front.
          rotation={[0, s.church ? Math.atan2(s.at[0], s.at[2]) : 0, 0]}
          scale={s.scale}
        >
          <mesh geometry={s.rock} material={stone} castShadow receiveShadow />
          <primitive object={s.foliage} />
          {s.trunks && <mesh geometry={s.trunks} material={bark} castShadow />}
          {s.vines && <mesh geometry={s.vines} material={vine} />}
          {s.town && (
            <>
              <mesh geometry={s.town.buildings} material={brick} castShadow receiveShadow />
              <mesh geometry={s.town.windows} material={glow} />
            </>
          )}
          {s.bigTree && (
            <>
              <mesh geometry={s.bigTree.wood} material={wood} castShadow receiveShadow />
              <primitive object={s.bigTree.canopy} />
            </>
          )}
          {s.molo && <mesh geometry={s.molo} material={brick} castShadow receiveShadow />}
        </group>
      ))}

      {/* a giant strawberry drifting with the islands, tipped a little to show off its leaves */}
      <group position={[-2.9, -0.5, 2.7]} rotation={[0.25, 0, -0.2]} scale={1.7}>
        <group ref={berry}>
          <mesh geometry={strawberry.body} material={strawberry.skin} castShadow receiveShadow />
          <primitive object={strawberry.seeds} />
          <mesh geometry={strawberry.leaves} material={strawberry.leaf} castShadow />
        </group>
      </group>

      {/* drifting seeds and spores catching the light */}
      <Sparkles count={45} scale={[7, 4.5, 5]} size={1.6} speed={0.2} opacity={0.55} color="#d9f7c4" />
    </group>
  );
}
