"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect } from "react";
import { paintingAlt, paintings } from "./content";
import { href, pages, sections } from "@/sections/sections";

// A painting shown large with its story, year, medium and size; arrow keys and buttons step through them.
export default function PaintingLightbox({
  index,
  onChange,
}: {
  index: number | null;
  onChange: (i: number | null) => void;
}) {
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
          data-protect
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
                alt={paintingAlt(p)}
                width={p.width}
                height={p.height}
                sizes="(min-width: 768px) 60vw, 100vw"
                className="mx-auto h-auto max-h-[70vh] w-auto"
              />
            </div>
            <div className="flex flex-col justify-center pb-2">
              <p className="caps text-rose-ink">
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
              <a href={href(sections.commission)} onClick={close} className="btn btn-ink mt-8">
                Commission something like this
              </a>
              <Link
                href={pages.painting(p.slug)}
                className="caps ink-link mt-5 self-start pb-1 text-[0.68rem] text-ink-soft hover:text-ink"
              >
                Open this painting&apos;s page →
              </Link>
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
