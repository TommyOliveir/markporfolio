"use client";

// The 3D walk itself: Molo Plaza, St. Anne's and Molo Mansion on a warm afternoon. The canvas, the
// lights and the haze live here; everything that moves is run by Walk (walk.ts), one frame at a time.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { DirectionalLight } from "three";
import type { Game } from "./game";
import { HAZE } from "./sky";
import { Walk } from "./walk";

function Molo({ game, lite }: { game: Game; lite: boolean }) {
  const scene = useThree((s) => s.scene);
  const sun = useRef<DirectionalLight>(null);
  const walk = useRef<Walk | null>(null);

  // Built here rather than during render, so each mount gets its own (and cleans it up again).
  useEffect(() => {
    const w = new Walk(game, lite);
    walk.current = w;
    scene.add(w.sky, w.root);
    const light = sun.current;
    if (light) scene.add(light.target);
    return () => {
      scene.remove(w.sky, w.root);
      if (light) scene.remove(light.target);
      w.dispose();
      walk.current = null;
    };
  }, [scene, game, lite]);

  useFrame((state, dt) => walk.current?.frame(state.clock.elapsedTime, dt, state.camera, sun.current));

  return (
    <>
      <hemisphereLight args={["#d6ebff", "#c9a57a", 1.15]} />
      <ambientLight intensity={0.15} color="#ffe8cc" />
      <directionalLight
        ref={sun}
        color="#ffe3bd"
        intensity={2.9}
        castShadow
        shadow-mapSize={lite ? [1024, 1024] : [2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.04}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={1}
        shadow-camera-far={200}
      />
    </>
  );
}

/** `active: false` pauses drawing (the preview window does this when it scrolls out of sight). */
export default function FindMarkScene({ game, lite, active = true }: { game: Game; lite: boolean; active?: boolean }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      shadows="percentage"
      dpr={[1, lite ? 1.5 : 2]}
      camera={{ fov: 50, near: 0.25, far: 2600, position: [100, 80, 120] }}
      gl={{ antialias: !lite, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[HAZE]} />
      <fog attach="fog" args={[HAZE, 90, 360]} />
      <Molo game={game} lite={lite} />
    </Canvas>
  );
}
