"use client";

import { Billboard } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CanvasTexture, SRGBColorSpace, type Group, type MeshBasicMaterial } from "three";

const words = [
  { text: "Original drawings", style: "display" },
  { text: "Cities", style: "caps" },
  { text: "Watercolour & acrylic prints", style: "display" },
  { text: "Nature", style: "caps" },
  { text: "Postcards", style: "display" },
  { text: "Seas", style: "caps" },
  { text: "Commissions open", style: "display" },
  { text: "Reveries", style: "caps" },
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
function Ring({ labels }: { labels: Label[] }) {
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
      const a = (i / labels.length) * Math.PI * 2 + angle.current;
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

// A little island that floats at the centre of the ring: grass top, rocky underside, a cottage and a tree.
function Island() {
  const island = useRef<Group>(null);

  useFrame((state, delta) => {
    const g = island.current;
    if (!g) return;
    g.rotation.y += delta * 0.35;
    g.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.18;
  });

  return (
    <group ref={island} scale={1.2}>
      {/* rocky underside */}
      <mesh position={[0, -0.85, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[1.5, 1.7, 7]} />
        <meshStandardMaterial color="#8a5a3b" flatShading />
      </mesh>
      <mesh position={[0.5, -1.55, 0.2]} rotation={[Math.PI, 0.4, 0]}>
        <coneGeometry args={[0.45, 0.7, 5]} />
        <meshStandardMaterial color="#6f4a31" flatShading />
      </mesh>
      {/* grassy top */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.62, 1.5, 0.3, 7]} />
        <meshStandardMaterial color="#2f9f7a" flatShading />
      </mesh>
      {/* cottage */}
      <mesh position={[-0.35, 0.4, 0.1]}>
        <boxGeometry args={[0.65, 0.5, 0.55]} />
        <meshStandardMaterial color="#f4d78f" flatShading />
      </mesh>
      <mesh position={[-0.35, 0.82, 0.1]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.55, 0.42, 4]} />
        <meshStandardMaterial color="#d63c62" flatShading />
      </mesh>
      {/* tree */}
      <mesh position={[0.65, 0.35, -0.2]}>
        <cylinderGeometry args={[0.06, 0.08, 0.4, 6]} />
        <meshStandardMaterial color="#6f4a31" flatShading />
      </mesh>
      <mesh position={[0.65, 0.78, -0.2]}>
        <coneGeometry args={[0.32, 0.65, 6]} />
        <meshStandardMaterial color="#1b8e8e" flatShading />
      </mesh>
      <mesh position={[0.65, 1.1, -0.2]}>
        <coneGeometry args={[0.22, 0.5, 6]} />
        <meshStandardMaterial color="#1b8e8e" flatShading />
      </mesh>
    </group>
  );
}

export default function RibbonScene() {
  const wrapper = useRef<HTMLDivElement>(null);
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
    <div ref={wrapper} className="h-52 w-full sm:h-72" aria-hidden>
      <Canvas
        camera={{ position: [0, 3.2, 13], fov: 38 }}
        dpr={[1, 2]}
        frameloop={inView ? "always" : "never"}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 5, 4]} intensity={2.2} />
        {labels && <Ring labels={labels} />}
        <Island />
      </Canvas>
    </div>
  );
}
