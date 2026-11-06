"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { site } from "@/data/site";
import { seeded } from "@/lib/seeded";
import { FlyingTreehouse, FlyingTreehouseGrand, SkyFish, SkyJellyfish } from "./illustrations";
import InkSkyline from "./InkSkyline";
import { Balloon } from "@/components/ui/Ornaments";
import Watercolor from "@/components/ui/Watercolor";
import { href, sections } from "@/sections/sections";

const rand = seeded(7);
const stars = Array.from({ length: 70 }, () => ({
  x: rand.range(0, 100),
  y: rand.range(0, 62),
  s: rand.range(1, 2.6),
  d: rand.range(0, 4),
  sparkle: rand.next() < 0.18,
}));

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const skyY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const fade = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={ref}
      id={sections.top.id}
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-night text-paper"
    >
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
          className="absolute top-[5rem] right-3 size-12 sm:top-[max(11%,6.25rem)] sm:right-[4%] sm:size-24 md:right-[6%] md:size-28 lg:top-[13%] lg:right-[5%] lg:size-36 xl:right-[9%]"
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
        <div className="absolute top-[11.75rem] left-[5%] w-10 animate-drift sm:top-[max(12%,7.5rem)] sm:left-[5%] sm:w-14 md:top-[38%] lg:top-[24%] lg:left-[6%] lg:w-16 xl:left-[3%] [animation-duration:16s]">
          <Balloon a="#d63c62" b="#f2a516" />
        </div>
        <div className="absolute top-[11%] left-[30%] hidden w-8 animate-drift md:top-[max(11%,7.5rem)] md:left-[3%] md:block lg:top-[max(13%,7rem)] lg:left-[calc(50%-16rem)] xl:top-[11%] xl:left-[30%] [animation-delay:-5s] [animation-duration:19s]">
          <Balloon a="#1b8e8e" b="#f4d78f" />
        </div>
        <div className="absolute top-[40%] right-[22%] hidden w-11 animate-drift sm:top-[62%] sm:right-[calc(92%-2.75rem)] sm:block md:top-[34%] md:right-[5%] lg:top-[40%] lg:right-[calc(50%-19.125rem)] xl:right-[22%] [@media(max-height:500px)]:hidden [animation-delay:-9s] [animation-duration:22s]">
          <Balloon a="#2c56b8" b="#d63c62" />
        </div>
        <motion.div
          className="absolute top-[28%] left-[15%] hidden w-44 sm:top-[calc(15svh+5.5rem)] sm:left-[calc(50%-19rem)] sm:block sm:w-28 md:top-[calc(15svh+2rem)] md:left-[calc(50%-21rem)] md:w-36 lg:top-[calc(15svh+4.5rem)] lg:left-[calc(50%-22.75rem)] lg:w-44 xl:top-[28%] xl:left-[10%] xl:w-48 [@media(max-height:500px)]:hidden"
          animate={{ y: [0, -12, 0, 14, 0], rotate: [1.5, -1.5, 1.5] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        >
          <FlyingTreehouseGrand />
        </motion.div>
        <motion.div
          className="absolute top-[4.65rem] right-[5.5rem] w-12 sm:top-[27%] sm:right-[6%] sm:w-20 md:top-[26%] md:right-[calc(50%-16.75rem)] lg:top-[15%] lg:right-[calc(5%+10rem)] lg:w-24 xl:right-[calc(9%+11rem)] [@media(max-height:500px)]:hidden"
          animate={{ y: [0, -26, -8, -30, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            animate={{ scaleY: [1, 0.9, 1], scaleX: [1, 1.05, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "50% 20%" }}
          >
            <SkyJellyfish />
          </motion.div>
        </motion.div>
        <motion.div
          className="absolute top-[52%] right-[2%] w-12 sm:top-[60%] sm:right-[3%] sm:w-28 md:top-[48%] lg:top-[46%] lg:right-[6%] lg:w-32 xl:top-auto xl:right-[3%] xl:bottom-[calc(32vw+0.75rem)] xl:w-28 [@media(max-height:500px)]:hidden"
          animate={{ y: [0, -16, 0, 10, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
          <FlyingTreehouse />
        </motion.div>
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
        className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-4 pt-[9.25rem] pb-10 text-center sm:pt-[15svh] [@media(max-height:500px)]:pt-28"
      >
        {/* One heading for search engines and screen readers: "Flying Treehouse · Iloilo City — Mark".
            Each line keeps its own look; entrances are CSS (animate-rise) so the text shows without waiting for JS. */}
        <h1 className="flex flex-col items-center">
          <span className="caps block animate-rise text-[0.62rem] [animation-delay:0.2s] motion-reduce:animate-none tracking-[0.15em] text-gold-soft sm:text-[0.72rem] sm:tracking-[0.22em]">
            Flying Treehouse &nbsp;·&nbsp; Iloilo City
          </span>
          <span className="sr-only"> — </span>
          <span className="font-display mt-3 block animate-rise-blur [animation-delay:0.35s] motion-reduce:animate-none text-[clamp(5rem,17vw,11rem)] leading-[0.9] font-medium tracking-tight">
            {site.artist}
          </span>
        </h1>

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

        <p className="mt-5 animate-rise [animation-delay:1s] motion-reduce:animate-none max-w-[21rem] text-xl text-pretty italic text-paper/80 sm:max-w-[22rem] sm:text-[1.4rem]">
          {site.tagline}
        </p>

        <div className="mt-9 flex animate-rise [animation-delay:1.3s] motion-reduce:animate-none flex-wrap items-center justify-center gap-4">
          <a href={href(sections.paintings)} className="btn btn-gold">
            Enter the gallery
          </a>
          <a href={href(sections.commission)} className="btn btn-line-light">
            Commission a piece
          </a>
        </div>
      </motion.div>

      {/* the town, drawn in */}
      <InkSkyline className="relative mt-auto block h-[30svh] min-h-[190px] w-full sm:h-[32vw]" />
    </section>
  );
}
