"use client";

import { Billboard } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useInView } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { CanvasTexture, Fog, PerspectiveCamera, SRGBColorSpace, type Group, type MeshBasicMaterial } from "three";
import FloatingMountain from "./FloatingMountain";
import { Spin } from "./spin";

const words = [
  { text: "Original drawings", style: "display" },
  { text: "Cities", style: "caps" },
  { text: "Watercolour & acrylic prints", style: "display" },
  { text: "Nature", style: "caps" },
  { text: "Postcards", style: "display" },
  { text: "Seas", style: "caps" },
  { text: "Commissions open", style: "display" },
  { text: "Iloilo", style: "caps" },
] as const;

// The ring is an ellipse: wide across the screen, shallow front to back.
const RADIUS_X = 9.5;
const RADIUS_Z = 4.6;
const LABEL_HEIGHT = 1.25;

type Label = { texture: CanvasTexture; aspect: number };

// Draws each word onto a canvas with the page's own fonts, so it matches the rest of the site.
async function makeLabels(): Promise<Label[]> {
  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue("--font-cormorant").trim() || "Georgia, serif";
  const caps = css.getPropertyValue("--font-cinzel").trim() || "Georgia, serif";
  const fonts = {
    display: { font: `italic 500 88px ${display}`, color: "#4a4657", spacing: "0px", text: (t: string) => t },
    caps: { font: `600 62px ${caps}`, color: "#d63c62", spacing: "8px", text: (t: string) => t.toUpperCase() },
  };

  // If a font fails to load the words still draw, in the fallback face.
  await Promise.allSettled([document.fonts.load(fonts.display.font), document.fonts.load(fonts.caps.font)]);

  return words.map((w) => {
    const f = fonts[w.style];
    const measure = document.createElement("canvas").getContext("2d")!;
    measure.font = f.font;
    measure.letterSpacing = f.spacing;
    const label = f.text(w.text);
    const width = Math.ceil(measure.measureText(label).width) + 48;
    const height = 140;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.font = f.font;
    ctx.letterSpacing = f.spacing;
    ctx.fillStyle = f.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, width / 2, height / 2 + 4);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    return { texture, aspect: width / height };
  });
}

// Words circling on a ring. Each one fades as it swings round the back.
function Ring({ labels, spin }: { labels: Label[]; spin: Spin }) {
  const group = useRef<Group>(null);
  const slots = useRef<(Group | null)[]>([]);
  const materials = useRef<(MeshBasicMaterial | null)[]>([]);
  const angle = useRef(0);
  const lastScroll = useRef(0);
  const boost = useRef(0);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    // Scrolling the page spins the ring faster, then it eases back to a slow drift.
    const y = window.scrollY;
    boost.current = Math.min(boost.current * 0.94 + Math.abs(y - lastScroll.current) * 0.0012, 1.6);
    lastScroll.current = y;

    angle.current += delta * (0.2 + boost.current);
    g.rotation.x += (state.pointer.y * 0.08 - g.rotation.x) * 0.05;

    labels.forEach((_, i) => {
      const a = (i / labels.length) * Math.PI * 2 + angle.current + spin.angle;
      slots.current[i]?.position.set(Math.sin(a) * RADIUS_X, 0, Math.cos(a) * RADIUS_Z);
      const m = materials.current[i];
      if (m) m.opacity = 0.1 + 0.9 * ((Math.cos(a) + 1) / 2) ** 2; // 1 = facing us, fading behind the island
    });
  });

  return (
    <group ref={group} position={[0, -0.5, 0]}>
      {labels.map((label, i) => (
        <group
          key={words[i].text}
          ref={(el) => {
            slots.current[i] = el;
          }}
        >
          <Billboard>
            <mesh>
              <planeGeometry args={[LABEL_HEIGHT * label.aspect, LABEL_HEIGHT]} />
              <meshBasicMaterial
                ref={(m) => {
                  materials.current[i] = m;
                }}
                map={label.texture}
                transparent
                depthWrite={false}
              />
            </mesh>
          </Billboard>
        </group>
      ))}
    </group>
  );
}

// Keeps the islands' whole orbit in frame. On wide screens the camera sits at its usual distance;
// on narrow ones (phones) it backs off until the scene's width fits, raising its height to keep the
// same downward angle. The haze moves with it so the look doesn't change.
const SCENE_WIDTH = 14; // world units that must stay visible across the band
const BASE_DISTANCE = 13;
function CameraFit() {
  const size = useThree((state) => state.size);
  const get = useThree((state) => state.get);
  useEffect(() => {
    const { camera, scene } = get();
    if (!(camera instanceof PerspectiveCamera)) return;
    const halfFov = ((camera.fov / 2) * Math.PI) / 180;
    const aspect = size.width / size.height;
    const distance = Math.max(BASE_DISTANCE, SCENE_WIDTH / (2 * Math.tan(halfFov) * aspect));
    camera.position.set(0, (3.2 * distance) / BASE_DISTANCE, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    if (scene.fog instanceof Fog) {
      scene.fog.near = distance + 1;
      scene.fog.far = distance + 17;
    }
  }, [get, size]);
  return null;
}

// Advances the spin each frame so a fling carries on after the visitor lets go.
function SpinMomentum({ spin }: { spin: Spin }) {
  useFrame((_, delta) => spin.step(delta));
  return null;
}

export default function RibbonScene() {
  const wrapper = useRef<HTMLDivElement>(null);
  const [spin] = useState(() => new Spin());

  // Dragging (or swiping) sideways turns the islands and the words together.
  // touch-action: pan-y keeps vertical swipes scrolling the page as usual.
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    spin.start(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  const inView = useInView(wrapper);
  const [labels, setLabels] = useState<Label[] | null>(null);

  useEffect(() => {
    let live = true;
    makeLabels().then((l) => live && setLabels(l));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div
      ref={wrapper}
      className="h-80 w-full cursor-grab touch-pan-y select-none active:cursor-grabbing sm:h-[30rem]"
      aria-hidden
      onPointerDown={onPointerDown}
      onPointerMove={(e) => spin.move(e.clientX)}
      onPointerUp={() => spin.end()}
      onPointerCancel={() => spin.end()}
    >
      <Canvas
        camera={{ position: [0, 3.2, 13], fov: 38 }}
        dpr={[1, 2]}
        shadows
        frameloop={inView ? "always" : "never"}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        {/* dawn-coloured haze matching the middle of the sky behind, so distant things soften into it */}
        <fog attach="fog" args={["#efcdb6", 14, 30]} />
        <hemisphereLight args={["#dcefff", "#4a4034", 0.75]} />
        {/* low warm sun raking across the cliffs, plus a cool light from behind to edge the silhouette */}
        <directionalLight
          position={[5, 5, 4]}
          intensity={3.6}
          color="#fff0d6"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
        />
        <directionalLight position={[-4, 2, -5]} intensity={0.9} color="#bcd8ff" />
        <CameraFit />
        <SpinMomentum spin={spin} />
        {labels && <Ring labels={labels} spin={spin} />}
        <FloatingMountain spin={spin} />
      </Canvas>
    </div>
  );
}
