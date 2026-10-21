"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { categories, paintings } from "@/data/site";
import SectionHeading from "./SectionHeading";
import TiltCard from "./TiltCard";
import Watercolor from "./Watercolor";

const filters = ["All", ...categories] as const;
type Filter = (typeof filters)[number];

// Column count tracks the same breakpoints as Tailwind's sm (640px) and lg (1024px).
const lg = "(min-width: 1024px)";
const sm = "(min-width: 640px)";
function subscribe(onChange: () => void) {
  const queries = [lg, sm].map((q) => window.matchMedia(q));
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}
const getColumns = () => (window.matchMedia(lg).matches ? 3 : window.matchMedia(sm).matches ? 2 : 1);
const getServerColumns = () => 3;

export default function Gallery() {
  const [filter, setFilter] = useState<Filter>("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const columns = useSyncExternalStore(subscribe, getColumns, getServerColumns);
  const shown = filter === "All" ? paintings : paintings.filter((p) => p.category === filter);

  return (
    <section id="gallery" className="relative px-4 pt-28 pb-28 sm:px-6">
      <Watercolor
        seed={3}
        className="opacity-70"
        blooms={[
          { x: 4, y: 6, r: 16, color: "#f2a516", opacity: 0.18 },
          { x: 96, y: 30, r: 14, color: "#1b8e8e", opacity: 0.15 },
          { x: 2, y: 70, r: 12, color: "#d63c62", opacity: 0.12 },
        ]}
      />

      <SectionHeading numeral="I" kicker="The Paintings" title="Cities, seas & other reveries">
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
      <div className="relative mx-auto flex max-w-6xl items-start gap-10">
        {Array.from({ length: columns }, (_, c) => (
          <div key={c} className="flex min-w-0 flex-1 flex-col gap-12">
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
                          <div className="print p-3 sm:p-4">
                            <Image
                              src={p.src}
                              alt={p.title}
                              width={p.width}
                              height={p.height}
                              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                              className="h-auto w-full"
                            />
                          </div>
                        </TiltCard>
                        <div className="mt-4 flex items-baseline gap-4 px-1">
                          <span className="font-display text-sm text-ink-faint italic">
                            No. {String(n + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 flex-1 border-t border-ink/15 pt-2">
                            <h3 className="font-display text-2xl leading-tight font-medium transition-colors group-hover:text-rose">
                              {p.title}
                            </h3>
                            <p className="caps mt-1 text-[0.62rem] text-ink-faint">
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

      <Lightbox index={openIndex} onChange={setOpenIndex} />
    </section>
  );
}

function Lightbox({ index, onChange }: { index: number | null; onChange: (i: number | null) => void }) {
  const close = useCallback(() => onChange(null), [onChange]);
  const step = useCallback(
    (d: number) => {
      if (index === null) return;
      onChange((index + d + paintings.length) % paintings.length);
    },
    [index, onChange],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [index, close, step]);

  const p = index !== null ? paintings[index] : null;

  return (
    <AnimatePresence>
      {p && index !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-night/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={p.title}
        >
          <motion.div
            key={p.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative grid w-full max-w-5xl gap-8 bg-paper p-4 shadow-2xl sm:p-8 md:grid-cols-[1.4fr_1fr]"
          >
            <div className="print self-start p-3">
              <Image
                src={p.src}
                alt={p.title}
                width={p.width}
                height={p.height}
                sizes="(min-width: 768px) 60vw, 100vw"
                className="mx-auto h-auto max-h-[70vh] w-auto"
              />
            </div>
            <div className="flex flex-col justify-center pb-2">
              <p className="caps text-rose">
                No. {String(index + 1).padStart(2, "0")} · {p.category}
              </p>
              <h3 className="font-display mt-3 text-4xl leading-tight font-medium sm:text-5xl">{p.title}</h3>
              <p className="mt-4 text-xl leading-snug text-ink-soft italic">{p.story}</p>
              <dl className="mt-8 divide-y divide-ink/10 border-y border-ink/15">
                {[
                  ["Year", p.year],
                  ["Medium", p.medium],
                  ["Size", p.size],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="caps text-ink-faint">{k}</dt>
                    <dd className="font-display text-lg">{v}</dd>
                  </div>
                ))}
              </dl>
              <a href="#commission" onClick={close} className="btn btn-ink mt-8">
                Commission something like this
              </a>
              <div className="mt-6 flex justify-between gap-3">
                <button onClick={() => step(-1)} className="caps ink-link pb-1 text-ink-soft hover:text-ink">
                  ← Previous
                </button>
                <button onClick={() => step(1)} className="caps ink-link pb-1 text-ink-soft hover:text-ink">
                  Next →
                </button>
              </div>
            </div>
            <button
              onClick={close}
              aria-label="Close"
              className="absolute top-2 right-2 grid size-10 place-items-center text-2xl text-ink-soft transition-colors hover:text-rose sm:top-3 sm:right-3"
            >
              ✕
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
