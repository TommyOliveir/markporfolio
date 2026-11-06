"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useState } from "react";
import { textileAlt, textiles, type Textile } from "./content";
import ImageLightbox, { type LightboxItem } from "@/components/ui/ImageLightbox";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { sections } from "@/sections/sections";

const tilts = [-1.2, 0.8, -0.6, 1.1, -0.9, 0.5, -0.4];

// A pinking-shear edge along the bottom of each swatch: a polygon that runs straight across the
// top and down the sides, then zigzags back along the bottom.
const TEETH = 14;
const pinked = `polygon(0 0, 100% 0, ${Array.from({ length: TEETH * 2 + 1 }, (_, i) => {
  const x = 100 - (i * 100) / (TEETH * 2);
  return `${x.toFixed(2)}% ${i % 2 ? "100%" : "97%"}`;
}).join(", ")})`;

// How wide each swatch is drawn (two per row on phones, three on tablets, four from 1024px).
const swatchSizes = "(min-width: 1024px) 270px, (min-width: 640px) 30vw, 50vw";

export default function Textiles() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id={sections.textiles.id}
      data-protect
      className="relative overflow-hidden bg-card px-4 py-28 sm:px-6"
      // a faint woven-linen texture
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, rgb(29 27 42 / 0.03) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgb(29 27 42 / 0.025) 0 1px, transparent 1px 4px)",
      }}
    >
      <SectionHeading numeral="II" kicker="Textiles" title="Gardens you can wear">
        Hand-painted repeat patterns — lotus ponds, songbird vines and wild gardens — designed to be printed on fabric.
      </SectionHeading>

      <ul className="relative mx-auto flex max-w-6xl flex-wrap justify-center gap-x-4 gap-y-10 sm:gap-x-8 sm:gap-y-14 lg:gap-x-10">
        {textiles.map((t, i) => (
          <li key={t.slug} className="w-[calc(50%-0.5rem)] sm:w-[calc((100%-4rem)/3)] lg:w-[calc((100%-7.5rem)/4)]">
            <Reveal delay={(i % 4) * 0.08}>
              <Swatch textile={t} tilt={tilts[i % tilts.length]} onOpen={() => setOpenIndex(i)} />
            </Reveal>
          </li>
        ))}
      </ul>

      <ImageLightbox items={zoomItems} index={openIndex} onChange={setOpenIndex} noun="design" />
    </section>
  );
}

function Swatch({ textile: t, tilt, onOpen }: { textile: Textile; tilt: number; onOpen: () => void }) {
  return (
    <motion.figure
      style={{ rotate: tilt }}
      whileHover={{ rotate: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View the full ${t.title} design`}
        className="group block w-full cursor-zoom-in"
      >
        {/* the shadow sits on a wrapper, since clip-path would cut off a shadow on the swatch itself */}
        <div className="drop-shadow-[0_14px_18px_rgb(29_27_42/0.22)]">
          <div className="relative aspect-[3/4] overflow-hidden" style={{ clipPath: pinked }}>
            <Image
              src={t.src}
              alt={textileAlt(t)}
              fill
              sizes={swatchSizes}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* a soft fold of light across the cloth */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgb(255_255_255/0.18)_50%,transparent_65%)]"
            />
          </div>
        </div>
      </button>
      <figcaption className="mt-4 px-0.5">
        <p className="font-display text-lg leading-tight italic sm:text-xl">{t.title}</p>
        <p className="caps mt-1 text-[0.55rem] text-ink-faint sm:text-[0.6rem]">{t.motifs.join(" · ")}</p>
      </figcaption>
    </motion.figure>
  );
}

// What the zoom view shows: the whole design, uncropped.
const zoomItems: LightboxItem[] = textiles.map((t) => ({
  key: t.slug,
  src: t.src,
  width: t.width,
  height: t.height,
  alt: textileAlt(t),
  thumbSizes: swatchSizes,
  title: t.title,
  subtitle: t.motifs.join(" · "),
}));
