"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { collectors, site, type Collector } from "@/data/site";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import Watercolor from "./Watercolor";

const tilts = [-2, 1.5, -1, 2, -1.5, 1];

// Only real photos can be opened larger; the lightbox steps through these.
const photos = collectors.filter((c) => c.photo);

export default function Collectors() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="collectors" data-protect className="relative overflow-hidden bg-paper-deep/60 px-4 py-28 sm:px-6">
      <Watercolor
        seed={33}
        blooms={[
          { x: 8, y: 12, r: 18, color: "#1b8e8e", opacity: 0.12 },
          { x: 92, y: 40, r: 16, color: "#f2a516", opacity: 0.16 },
          { x: 14, y: 82, r: 14, color: "#d63c62", opacity: 0.1 },
        ]}
      />

      <SectionHeading numeral="III" kicker="Collectors" title="Hung on walls far from home">
        A few of the lovely people who took a painting home, snapped with {site.artist} on the day.
      </SectionHeading>

      {/* Each card's width follows its photo's shape so every photo in a row is the same height:
          a wide photo gets a wider card. Rows are centred, so a short last row sits in the middle. */}
      <ul className="relative mx-auto flex max-w-6xl flex-wrap items-start justify-center gap-x-10 gap-y-14">
        {collectors.map((c, i) => (
          <li
            key={c.name}
            style={{ "--ar": photoRatio(c) } as CSSProperties}
            className="w-full max-w-sm sm:w-[calc(((100%_-_2.5rem)_/_2_-_1.5rem)_*_1.25_*_var(--ar)_+_1.5rem)] sm:max-w-none lg:w-[calc(((100%_-_5rem)_/_3_-_1.5rem)_*_1.25_*_var(--ar)_+_1.5rem)]"
          >
            <Reveal delay={(i % 3) * 0.1}>
              <Polaroid
                collector={c}
                tilt={tilts[i % tilts.length]}
                onOpen={c.photo ? () => setOpenIndex(photos.indexOf(c)) : undefined}
              />
            </Reveal>
          </li>
        ))}
      </ul>

      <PhotoLightbox index={openIndex} onChange={setOpenIndex} />
    </section>
  );
}

// Photo frame shape (width / height). Wide photos keep their full frame so nobody at the
// edges is cropped; tall ones are trimmed to 4:5 so the cards don't get too long.
function photoRatio(c: Collector) {
  return c.photo ? Math.max(c.photo.width / c.photo.height, 4 / 5) : 4 / 5;
}

// How wide each card's photo is actually drawn, so the browser downloads a file that size
// rather than one sized for a third or half of the whole screen. Mirrors the card widths above
// (max-w-6xl grid, gap-x-10, p-3 frame); wide photos get proportionally wider cards.
function cardSizes(c: Collector) {
  const k = +(1.25 * photoRatio(c)).toFixed(3);
  return [
    `(min-width: 1024px) ${Math.round(417 * photoRatio(c) + 24)}px`,
    `(min-width: 640px) calc((50vw - 68px) * ${k} + 24px)`,
    "(min-width: 416px) 384px",
    "calc(100vw - 32px)",
  ].join(", ");
}

// The zoomed photo fills the screen's height on wide screens and its width on narrow ones;
// tell the browser which, so it doesn't fetch a 1920px file to show at 400px.
function zoomSizes(c: Collector) {
  const ar = c.photo ? c.photo.width / c.photo.height : 1;
  return `(min-aspect-ratio: ${Math.round(ar * 1000)}/1000) calc((100vh - 12rem) * ${ar.toFixed(3)}), calc(100vw - 5rem)`;
}

function photoAlt(c: Collector) {
  return `${site.artist} with ${c.name}${c.painting ? `, holding “${c.painting}”` : ""}`;
}

function Polaroid({ collector: c, tilt, onOpen }: { collector: Collector; tilt: number; onOpen?: () => void }) {
  return (
    <motion.figure
      style={{ rotate: tilt }}
      whileHover={{ rotate: 0, y: -6 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="relative"
    >
      {/* strip of tape holding the print up */}
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 -rotate-3 bg-gold-soft/70 shadow-sm"
      />

      <div className="print p-3 pb-4">
        <div className="relative overflow-hidden" style={{ aspectRatio: photoRatio(c) }}>
          {c.photo ? (
            <button
              type="button"
              onClick={onOpen}
              aria-label={`View larger photo: ${c.name}`}
              className="group absolute inset-0 cursor-zoom-in"
            >
              <Image
                src={c.photo.src}
                alt={photoAlt(c)}
                fill
                sizes={cardSizes(c)}
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              {/* magnifier hint */}
              <span
                aria-hidden
                className="absolute right-2 bottom-2 grid size-9 place-items-center rounded-full bg-paper/85 text-ink opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4.5 4.5M11 8.5v5M8.5 11h5" strokeLinecap="round" />
                </svg>
              </span>
            </button>
          ) : (
            <PlaceholderPhoto tint={c.tint} />
          )}
        </div>
        {c.note && <p className="font-script mt-3 text-center text-xl text-ink-soft">{c.note}</p>}
      </div>

      <figcaption className="mt-5 px-1 text-center">
        <p className="font-display text-2xl italic">{c.name}</p>
        {(c.role || c.painting) && (
          <p className="caps mt-1 text-[0.62rem] text-ink-faint">
            {c.role}
            {c.role && c.painting && <> &nbsp;·&nbsp; </>}
            {c.painting && <>owns “{c.painting}”</>}
          </p>
        )}
      </figcaption>
    </motion.figure>
  );
}

// Drawn stand-in until a real photo is added: two figures holding up a framed painting.
function PlaceholderPhoto({ tint }: { tint: string }) {
  return (
    <div className="relative size-full" style={{ background: `color-mix(in oklab, ${tint} 22%, var(--color-card))` }}>
      <svg viewBox="0 0 200 250" className="absolute inset-0 size-full" aria-hidden>
        <g stroke="#1d1b2a" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
          {/* the artist */}
          <circle cx={58} cy={92} r={20} fill="#f4d78f" />
          <path d="M18 250Q20 138 58 132Q96 138 98 250Z" fill={tint} fillOpacity={0.55} />
          {/* the collector */}
          <circle cx={142} cy={86} r={21} fill="#f4d78f" />
          <path d="M100 250Q104 132 142 126Q182 132 184 250Z" fill="#1d1b2a" fillOpacity={0.18} />
          {/* the painting they're holding */}
          <rect x={66} y={150} width={68} height={56} fill="#fdfaf3" />
          <rect x={72} y={156} width={56} height={44} fill={tint} fillOpacity={0.35} strokeWidth={1} />
          <path d="M76 192Q92 172 104 184T126 176" fill="none" strokeWidth={1} />
          <circle cx={116} cy={166} r={4} fill="#f2a516" strokeWidth={1} />
        </g>
      </svg>
      <p className="caps absolute inset-x-0 top-4 text-center text-[0.6rem] text-ink/50">Photo coming soon</p>
    </div>
  );
}

// Full-size view of a collector photo. Esc closes, arrow keys step through the photos.
function PhotoLightbox({ index, onChange }: { index: number | null; onChange: (i: number | null) => void }) {
  const close = useCallback(() => onChange(null), [onChange]);
  const step = useCallback(
    (d: number) => {
      if (index === null) return;
      onChange((index + d + photos.length) % photos.length);
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

  const c = index !== null ? photos[index] : null;
  // Fetch the photos either side in the background, so stepping through is instant.
  const neighbours =
    index !== null && photos.length > 1
      ? [photos[(index + 1) % photos.length], photos[(index - 1 + photos.length) % photos.length]]
      : [];
  const [loaded, setLoaded] = useState<string | null>(null);

  return (
    <AnimatePresence>
      {c?.photo && (
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
          aria-label={photoAlt(c)}
        >
          <motion.figure
            key={c.name}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="print max-w-full p-3 pb-4 sm:p-4 sm:pb-5"
          >
            <div className="relative">
              {/* The card's copy is already downloaded: show it at once, then the sharp one fades in over it. */}
              <Image src={c.photo.src} alt="" aria-hidden fill sizes={cardSizes(c)} className="object-contain" />
              <Image
                src={c.photo.src}
                alt={photoAlt(c)}
                width={c.photo.width}
                height={c.photo.height}
                sizes={zoomSizes(c)}
                loading="eager"
                onLoad={() => setLoaded(c.photo!.src)}
                className={`relative mx-auto h-auto max-h-[calc(100svh-16rem)] w-auto max-w-full transition-opacity duration-300 sm:max-h-[calc(100svh-12rem)] ${
                  loaded === c.photo.src ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>
            <figcaption className="mt-3 text-center">
              {c.note && <p className="font-script text-xl text-ink-soft sm:text-2xl">{c.note}</p>}
              <p className="font-display mt-1 text-xl italic sm:text-2xl">
                {c.name}
                {c.role && (
                  <span className="caps ml-3 align-middle text-[0.62rem] text-ink-faint not-italic">{c.role}</span>
                )}
              </p>
            </figcaption>
          </motion.figure>

          {photos.length > 1 && (
            <>
              <LightboxButton
                label="Previous photo"
                className="bottom-5 left-5 sm:top-1/2 sm:bottom-auto sm:left-6 sm:-translate-y-1/2"
                onClick={() => step(-1)}
              >
                ←
              </LightboxButton>
              <LightboxButton
                label="Next photo"
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
                key={n.name}
                src={n.photo!.src}
                alt=""
                width={n.photo!.width}
                height={n.photo!.height}
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
  children: React.ReactNode;
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
