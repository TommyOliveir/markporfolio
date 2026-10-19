"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useState } from "react";
import { postcards, postcardShops, site, type Postcard } from "@/data/site";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import Watercolor from "./Watercolor";

const tilts = [-1.5, 1, -0.5, 1.5, -1, 0.5];

export default function Postcards() {
  return (
    <section id="postcards" className="relative overflow-hidden bg-paper-deep/60 px-4 pt-28 pb-28 sm:px-6">
      <Watercolor
        seed={21}
        blooms={[
          { x: 92, y: 8, r: 18, color: "#d63c62", opacity: 0.1 },
          { x: 6, y: 42, r: 16, color: "#2c56b8", opacity: 0.14 },
          { x: 85, y: 70, r: 14, color: "#f2a516", opacity: 0.16 },
        ]}
      />

      <SectionHeading numeral="II" kicker="Postcards" title="Little letters from elsewhere">
        Favourite pieces, printed on heavy card. Turn one over to read the back.
      </SectionHeading>

      <div className="relative mx-auto grid max-w-6xl gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
        {postcards.map((card, i) => (
          <Reveal key={card.slug} delay={(i % 3) * 0.1}>
            <FlipCard card={card} tilt={tilts[i % tilts.length]} />
          </Reveal>
        ))}
      </div>

      <WhereToBuy />
    </section>
  );
}

function FlipCard({ card, tilt }: { card: Postcard; tilt: number }) {
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
        className="block aspect-[3/2] w-full"
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
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
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

function WhereToBuy() {
  return (
    <Reveal className="relative mx-auto mt-20 max-w-5xl sm:mt-28">
      <div id="where-to-buy" className="scroll-mt-10 rounded-2xl  bg-white p-6 text-ink shadow-xl sm:p-12">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
          {/* Intro */}
          <div>
            <p className="caps text-sm font-semibold tracking-[0.16em] text-marigold text-ink/85">Not sold online</p>

            <h3 className="font-display mt-4">
              <span className="block text-4xl leading-tight font-medium tracking-[0.01em] sm:text-5xl">
                Find them in
              </span>

              <span className="-mt-1 block text-7xl leading-[0.9] font-bold tracking-[-0.01em] italic sm:text-8xl lg:text-9xl">
                person
              </span>
            </h3>

            <p className="mt-6 max-w-md text-lg leading-relaxed tracking-[0.01em] text-ink/85 sm:text-xl">
              Real paper, in a real place. Drop by Molo Mansion, flick through the racks, and pick your favourites.
            </p>

            <p className="caps mt-6 text-sm font-semibold tracking-[0.16em] text-ink/85">
              Find your next favourite postcard&nbsp;↓
            </p>
          </div>

          {/* Shop locations */}
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {postcardShops.map((shop, index) => (
              <li
                key={shop.name}
                className="group flex flex-col items-start gap-4 py-5 sm:flex-row sm:items-center sm:py-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="caps mb-2 text-sm font-semibold tracking-[0.16em] text-ink/85">Location 0{index + 1}</p>

                  <p className="font-display text-2xl font-medium tracking-[0.01em] sm:text-3xl">{shop.name}</p>

                  <p className="mt-1 text-base leading-relaxed tracking-[0.01em] text-ink/85 sm:text-lg">
                    {shop.address}
                  </p>

                  <p className="caps text-marigold mt-2 text-sm font-semibold tracking-[0.12em] text-ink/85">
                    {shop.hours}
                  </p>
                </div>

                <a
                  href={shop.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Get directions to ${shop.name}`}
                  className="caps inline-flex shrink-0 items-center gap-2 border-b border-ink/40 pb-1 text-sm font-semibold tracking-[0.16em] transition-all duration-200 hover:border-ink hover:gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                >
                  Directions
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  );
}
