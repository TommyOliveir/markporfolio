"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useState } from "react";
import { site } from "@/data/site";
import { type Postcard } from "./content";

// A postcard you can turn over: the artwork on the front, a handwritten note and stamp on the back.
export default function FlipCard({ card, tilt }: { card: Postcard; tilt: number }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      style={{ perspective: 1400, rotate: tilt }}
      whileHover={{ rotate: 0, y: -6 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="relative"
    >
      <button
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label={`${card.title} postcard — ${flipped ? "show front" : "turn over to read the back"}`}
        className="block w-full"
        style={{ aspectRatio: card.size ? card.size.width / card.size.height : 3 / 2 }}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative size-full"
        >
          {/* Front */}
          <div className="print absolute inset-0 p-2" style={{ backfaceVisibility: "hidden" }}>
            <div className="relative size-full overflow-hidden">
              <Image
                src={card.src}
                alt={card.title}
                fill
                sizes="(min-width: 1024px) 360px, (min-width: 640px) calc(50vw - 3rem), calc(100vw - 2rem)"
                className="object-cover"
              />
            </div>
          </div>

          {/* Back */}
          <div
            className="print absolute inset-0 flex flex-col p-4 text-left"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <p className="caps text-center text-[0.6rem] text-ink-faint">Post · Card</p>
            <div className="mt-2 grid flex-1 grid-cols-[1.2fr_1fr] gap-4">
              <div className="flex flex-col justify-between border-r border-ink/20 pr-4">
                <p className="font-script text-lg leading-snug text-ink sm:text-xl">{card.note}</p>
                <p className="font-script text-xl text-ink-soft">— {site.artist}</p>
              </div>
              <div className="relative flex flex-col">
                <div
                  className="ml-auto grid size-14 place-items-center p-1"
                  // Perforated stamp edge: tiled holes sit on the border, the picture covers the middle.
                  style={{
                    background: `radial-gradient(circle at 4px 4px, transparent 2.2px, ${card.stampColor} 2.6px) -4px -4px / 8px 8px`,
                  }}
                >
                  <div className="relative size-full overflow-hidden border-2 border-card">
                    <Image src={card.src} alt="" fill sizes="56px" className="object-cover" />
                  </div>
                </div>
                {/* Postmark */}
                <svg
                  viewBox="0 0 120 60"
                  className="pointer-events-none absolute top-5 right-8 w-24 text-ink/35"
                  aria-hidden
                >
                  <circle cx="30" cy="30" r="24" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="30" cy="30" r="17" fill="none" stroke="currentColor" strokeWidth="0.8" />
                  <text
                    x="30"
                    y="34"
                    textAnchor="middle"
                    fontSize="9"
                    fill="currentColor"
                    fontFamily="serif"
                    letterSpacing="1"
                  >
                    MMXXVI
                  </text>
                  {[0, 1, 2, 3].map((i) => (
                    <path
                      key={i}
                      d={`M58 ${16 + i * 9}q10 -5 20 0t20 0t20 0`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                  ))}
                </svg>
                <div className="mt-auto space-y-3 pb-1">
                  <div className="h-px bg-ink/25" />
                  <div className="h-px bg-ink/25" />
                  <div className="h-px bg-ink/25" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </button>
      <div className="mt-4 flex items-baseline justify-between px-1">
        <p className="font-display text-xl italic">{card.title}</p>
        <p className="caps text-[0.6rem] text-ink-faint">{flipped ? "Turn back" : "Turn over ↻"}</p>
      </div>
    </motion.div>
  );
}
