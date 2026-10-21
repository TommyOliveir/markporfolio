"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { Fragment } from "react";
import { CompassStar } from "./Ornaments";

const RibbonScene = dynamic(() => import("./RibbonScene"), {
  ssr: false,
  loading: () => <div className="h-52 w-full sm:h-72" aria-hidden />,
});

const offerings = ["Original drawings", "Watercolour & acrylic prints", "Postcards", "Commissions open"];
const subjects = ["Cities", "Nature", "Seas", "Reveries"];

function Row({ items, className, delay = 0 }: { items: string[]; className: string; delay?: number }) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:gap-x-9">
      {items.map((item, i) => (
        <Fragment key={item}>
          {i > 0 && <CompassStar points={4} className="size-3 text-rose" />}
          <motion.li
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: delay + i * 0.1 }}
            className={className}
          >
            {item}
          </motion.li>
        </Fragment>
      ))}
    </ul>
  );
}

// Still version, for visitors who prefer reduced motion.
function Placard() {
  return (
    <div className="flex flex-col items-center gap-5 border-y border-ink/15 px-4 py-8 sm:py-10">
      <Row items={offerings} className="font-display text-2xl text-ink-soft italic sm:text-3xl" />
      <div className="h-px w-16 bg-ink/20" aria-hidden />
      <Row items={subjects} delay={0.4} className="caps text-sm tracking-[0.2em] text-ink-faint" />
    </div>
  );
}

// A band between the hero and the gallery: words orbiting a gold lattice in 3D.
export default function Ribbon() {
  const reduced = useReducedMotion();

  return (
    <div className="relative overflow-hidden border-y border-ink/15 py-1">
      {reduced ? (
        <Placard />
      ) : (
        <div className="border-y border-ink/15">
          <RibbonScene />
          <p className="sr-only">{[...offerings, ...subjects].join(", ")}</p>
        </div>
      )}
    </div>
  );
}
