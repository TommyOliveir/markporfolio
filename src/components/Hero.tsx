"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { site } from "@/data/site";
import { seeded } from "@/lib/seeded";
import InkSkyline from "./InkSkyline";
import { Balloon } from "./Ornaments";
import Watercolor from "./Watercolor";

const rand = seeded(7);
const stars = Array.from({ length: 70 }, () => ({
  x: rand.range(0, 100),
  y: rand.range(0, 62),
  s: rand.range(1, 2.6),
  d: rand.range(0, 4),
  sparkle: rand.next() < 0.18,
}));

function SkyFish({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 70" className={className} aria-hidden>
      <g stroke="#1d1b2a" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
        <path d="M150 35Q118 6 70 22L30 6Q38 35 30 64L70 48Q118 64 150 35Z" fill="#f07aa8" />
        <path d="M118 18Q108 35 118 52" fill="none" />
        <circle cx={132} cy={31} r={3} fill="#1d1b2a" />
        {[0, 1, 2, 3].map((i) =>
          [0, 1, 2].map((k) => (
            <path
              key={`${i}-${k}`}
              d={`M${100 - i * 12} ${24 + k * 9 + (i % 2) * 4}q-6 4 0 8`}
              fill="none"
              strokeWidth={1}
            />
          )),
        )}
        <path d="M84 22Q92 8 104 16" fill="#f2a516" />
      </g>
    </svg>
  );
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const skyY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const fade = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} id="top" className="relative flex min-h-[100svh] flex-col overflow-hidden bg-night text-paper">
      {/* night sky */}
      <motion.div style={{ y: skyY }} className="absolute inset-0">
        <Watercolor
          seed={11}
          blend="screen"
          softness={26}
          blooms={[
            { x: 14, y: 18, r: 26, color: "#2c56b8", opacity: 0.32 },
            { x: 72, y: 10, r: 22, color: "#6b4aa6", opacity: 0.3 },
            { x: 94, y: 46, r: 18, color: "#1b8e8e", opacity: 0.28 },
            { x: 42, y: 52, r: 20, color: "#d63c62", opacity: 0.12 },
            { x: 4, y: 58, r: 14, color: "#1b8e8e", opacity: 0.22 },
          ]}
        />
        {stars.map((s, i) =>
          s.sparkle ? (
            <svg
              key={i}
              viewBox="0 0 10 10"
              className="absolute animate-twinkle text-gold-soft"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s * 5, animationDelay: `${s.d}s` }}
              aria-hidden
            >
              <path d="M5 0Q5 5 10 5Q5 5 5 10Q5 5 0 5Q5 5 5 0Z" fill="currentColor" />
            </svg>
          ) : (
            <span
              key={i}
              className="absolute animate-twinkle rounded-full bg-paper"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }}
            />
          ),
        )}

        {/* moon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute top-16 right-4 size-14 sm:top-[13%] sm:right-[9%] sm:size-36"
        >
          <div className="absolute -inset-16 rounded-full bg-[radial-gradient(circle,rgba(244,215,143,0.35),transparent_65%)]" />
          <svg viewBox="0 0 100 100" className="relative size-full" aria-hidden>
            <circle cx="50" cy="50" r="46" fill="#f4d78f" stroke="#1d1b2a" strokeWidth={1.6} />
            <path d="M62 58c10-6 18 4 12 14s-22 8-24 0 4-10 12-14z" fill="#e6ab2e" opacity={0.6} />
            <g fill="none" stroke="#1d1b2a" strokeWidth={1.2}>
              <circle cx="34" cy="36" r="7" />
              <circle cx="58" cy="28" r="4" />
              <circle cx="30" cy="62" r="5" />
              <circle cx="66" cy="66" r="3" />
            </g>
          </svg>
        </motion.div>

        {/* drifting things */}
        <div className="absolute top-[24%] left-[6%] w-10 animate-drift sm:w-16 [animation-duration:16s]">
          <Balloon a="#d63c62" b="#f2a516" />
        </div>
        <div className="absolute top-[11%] left-[30%] hidden w-8 animate-drift md:block [animation-delay:-5s] [animation-duration:19s]">
          <Balloon a="#1b8e8e" b="#f4d78f" />
        </div>
        <div className="absolute top-[40%] right-[22%] hidden w-11 animate-drift sm:block [animation-delay:-9s] [animation-duration:22s]">
          <Balloon a="#2c56b8" b="#d63c62" />
        </div>
        <motion.div
          className="absolute top-[34%] w-20 sm:w-28"
          initial={{ left: "-15%" }}
          animate={{ left: "115%" }}
          transition={{ duration: 48, ease: "linear", repeat: Infinity, delay: 2 }}
        >
          <motion.div
            animate={{ y: [0, -14, 0, 10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <SkyFish />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* headline */}
      <motion.div
        style={{ y: textY, opacity: fade }}
        className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-4 pt-[16svh] pb-10 text-center sm:pt-[15svh]"
      >
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1 }}
          className="caps text-gold-soft"
        >
          Acrylics &nbsp;·&nbsp; Oils &nbsp;·&nbsp; Ink &nbsp;·&nbsp; Watercolour
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.35, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="font-display mt-3 text-[clamp(5rem,17vw,11rem)] leading-[0.9] font-medium tracking-tight"
        >
          {site.artist}
        </motion.h1>

        <svg viewBox="0 0 320 30" className="-mt-1 w-56 text-gold sm:w-72" fill="none" aria-hidden>
          <motion.path
            d="M6 20C60 6 120 26 170 14S270 4 314 16M250 22c14-2 30-4 44-2"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1.2, duration: 1.4, ease: "easeInOut" }}
          />
        </svg>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-5 max-w-xl text-xl text-pretty italic text-paper/80 sm:text-2xl"
        >
          {site.tagline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 1 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-4"
        >
          <a href="#gallery" className="btn btn-gold">
            Enter the gallery
          </a>
          <a href="#commission" className="btn btn-line-light">
            Commission a piece
          </a>
        </motion.div>
      </motion.div>

      {/* the town, drawn in */}
      <InkSkyline className="relative mt-auto block h-[30svh] min-h-[190px] w-full sm:h-[32vw]" />
    </section>
  );
}
