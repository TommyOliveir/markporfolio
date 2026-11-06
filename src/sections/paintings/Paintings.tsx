"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import { categories, paintings } from "./content";
import SectionHeading from "@/components/ui/SectionHeading";
import TiltCard from "@/components/ui/TiltCard";
import Watercolor from "@/components/ui/Watercolor";
import PaintingLightbox from "./PaintingLightbox";
import { sections } from "@/sections/sections";

const filters = ["All", ...categories] as const;
type Filter = (typeof filters)[number];

// Column count: three from Tailwind's lg (1024px), otherwise two — phones too, so the gallery isn't one very long column.
const lg = "(min-width: 1024px)";
const sm = "(min-width: 640px)";
function subscribe(onChange: () => void) {
  const queries = [lg, sm].map((q) => window.matchMedia(q));
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}
const getColumns = () => (window.matchMedia(lg).matches ? 3 : 2);
const getServerColumns = () => 3;

export default function Paintings() {
  const [filter, setFilter] = useState<Filter>("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const columns = useSyncExternalStore(subscribe, getColumns, getServerColumns);
  const shown = filter === "All" ? paintings : paintings.filter((p) => p.category === filter);

  return (
    <section id={sections.paintings.id} data-protect className="relative px-4 pt-28 pb-28 sm:px-6">
      <Watercolor
        seed={3}
        className="opacity-70"
        blooms={[
          { x: 4, y: 6, r: 16, color: "#f2a516", opacity: 0.18 },
          { x: 96, y: 30, r: 14, color: "#1b8e8e", opacity: 0.15 },
          { x: 2, y: 70, r: 12, color: "#d63c62", opacity: 0.12 },
        ]}
      />

      <SectionHeading numeral="I" kicker="The Paintings" title="Cities, nature & the sea">
        Original drawings, painted in watercolour, acrylic or oil. Select a piece to see it up close.
      </SectionHeading>

      <div className="relative mb-14 flex flex-wrap justify-center gap-x-8 gap-y-3">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`caps relative pb-2 transition-colors ${filter === f ? "text-ink" : "text-ink-faint hover:text-ink"}`}
          >
            {f}
            {filter === f && <motion.span layoutId="filter-ink" className="absolute inset-x-0 bottom-0 h-px bg-rose" />}
          </button>
        ))}
      </div>

      {/* Paintings are dealt across the columns in order (1→col 1, 2→col 2, 3→col 3, 4→col 1…)
          so the gallery reads row by row while keeping its staggered, masonry feel. */}
      <div className="relative mx-auto flex max-w-6xl items-start gap-4 sm:gap-10">
        {Array.from({ length: columns }, (_, c) => (
          <div key={c} className="flex min-w-0 flex-1 flex-col gap-8 sm:gap-12">
            <AnimatePresence mode="popLayout">
              {shown
                .map((p, i) => ({ p, i }))
                .filter(({ i }) => i % columns === c)
                .map(({ p, i }) => {
                  const n = paintings.indexOf(p);
                  return (
                    <motion.div
                      key={p.slug}
                      layoutId={`painting-${p.slug}`}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{
                        duration: 0.8,
                        ease: [0.22, 1, 0.36, 1],
                        delay: c * 0.08 + Math.floor(i / columns) * 0.02,
                      }}
                    >
                      <button
                        onClick={() => setOpenIndex(n)}
                        className="group block w-full text-left"
                        aria-label={`View ${p.title}`}
                      >
                        <TiltCard>
                          <div className="print p-1.5 sm:p-4">
                            <Image
                              src={p.src}
                              alt={p.title}
                              width={p.width}
                              height={p.height}
                              sizes="(min-width: 1024px) 33vw, 50vw"
                              className="h-auto w-full"
                            />
                          </div>
                        </TiltCard>
                        <div className="mt-3 flex items-baseline gap-4 px-0.5 sm:mt-4 sm:px-1">
                          <span className="font-display hidden text-sm text-ink-faint italic sm:inline">
                            No. {String(n + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 flex-1 border-t border-ink/15 pt-2">
                            <h3 className="font-display text-base leading-tight font-medium transition-colors group-hover:text-rose sm:text-2xl">
                              {p.title}
                            </h3>
                            <p className="caps mt-1 text-[0.55rem] text-ink-faint sm:text-[0.62rem]">
                              {p.category} · {p.year}
                            </p>
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <PaintingLightbox index={openIndex} onChange={setOpenIndex} />
    </section>
  );
}
