"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

export type LightboxItem = {
  key: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  /** The `sizes` the thumbnail on the page used, so its already-downloaded copy can show instantly. */
  thumbSizes: string;
  title: string;
  /** Small caps line next to the title. */
  subtitle?: string;
  /** Handwritten line above the title. */
  note?: string;
};

// The zoomed image fills the screen's height on wide screens and its width on narrow ones;
// tell the browser which, so it doesn't fetch a 1920px file to show at 400px.
function zoomSizes(item: LightboxItem) {
  const ar = item.width / item.height;
  return `(min-aspect-ratio: ${Math.round(ar * 1000)}/1000) calc((100vh - 12rem) * ${ar.toFixed(3)}), calc(100vw - 5rem)`;
}

// Full-size view of an image on a print card. Esc closes, arrow keys and buttons step through
// the items, and the ones either side load in the background so stepping is instant.
export default function ImageLightbox({
  items,
  index,
  onChange,
  noun = "image",
}: {
  items: LightboxItem[];
  index: number | null;
  onChange: (i: number | null) => void;
  /** Used in the button labels, e.g. "Next photo". */
  noun?: string;
}) {
  const close = useCallback(() => onChange(null), [onChange]);
  const step = useCallback(
    (d: number) => {
      if (index === null) return;
      onChange((index + d + items.length) % items.length);
    },
    [index, items.length, onChange],
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

  const item = index !== null ? items[index] : null;
  const neighbours =
    index !== null && items.length > 1
      ? [items[(index + 1) % items.length], items[(index - 1 + items.length) % items.length]]
      : [];
  const [loaded, setLoaded] = useState<string | null>(null);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          // a solid dim instead of backdrop blur: blurring the whole page every frame is slow on phones
          className="fixed inset-0 z-[60] flex items-center justify-center bg-night/92 p-4 sm:p-8"
          data-protect
          role="dialog"
          aria-modal="true"
          aria-label={item.alt}
        >
          <motion.figure
            key={item.key}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="print max-w-full p-3 pb-4 text-ink sm:p-4 sm:pb-5"
          >
            <div className="relative">
              {/* The thumbnail's copy is already downloaded: show it at once, then the sharp one fades in over it. */}
              <Image src={item.src} alt="" aria-hidden fill sizes={item.thumbSizes} className="object-contain" />
              <Image
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                sizes={zoomSizes(item)}
                loading="eager"
                onLoad={() => setLoaded(item.src)}
                className={`relative mx-auto h-auto max-h-[calc(100svh-16rem)] w-auto max-w-full transition-opacity duration-300 sm:max-h-[calc(100svh-12rem)] ${
                  loaded === item.src ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>
            <figcaption className="mt-3 text-center">
              {item.note && <p className="font-script text-xl text-ink-soft sm:text-2xl">{item.note}</p>}
              <p className="font-display mt-1 text-xl italic sm:text-2xl">
                {item.title}
                {item.subtitle && (
                  <span className="caps ml-3 align-middle text-[0.62rem] text-ink-faint not-italic">
                    {item.subtitle}
                  </span>
                )}
              </p>
            </figcaption>
          </motion.figure>

          {items.length > 1 && (
            <>
              <LightboxButton
                label={`Previous ${noun}`}
                className="bottom-5 left-5 sm:top-1/2 sm:bottom-auto sm:left-6 sm:-translate-y-1/2"
                onClick={() => step(-1)}
              >
                ←
              </LightboxButton>
              <LightboxButton
                label={`Next ${noun}`}
                className="right-5 bottom-5 sm:top-1/2 sm:right-6 sm:bottom-auto sm:-translate-y-1/2"
                onClick={() => step(1)}
              >
                →
              </LightboxButton>
            </>
          )}
          <LightboxButton label="Close" className="top-3 right-3 sm:top-5 sm:right-5" onClick={close}>
            ✕
          </LightboxButton>

          <div className="hidden" aria-hidden>
            {neighbours.map((n) => (
              <Image
                key={n.key}
                src={n.src}
                alt=""
                width={n.width}
                height={n.height}
                sizes={zoomSizes(n)}
                loading="eager"
                fetchPriority="low"
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LightboxButton({
  label,
  className,
  onClick,
  children,
}: {
  label: string;
  className: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute grid size-11 place-items-center rounded-full bg-paper/90 text-lg text-ink shadow-lg transition-colors hover:bg-gold ${className}`}
    >
      {children}
    </button>
  );
}
