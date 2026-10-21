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

function FlyingTreehouse({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 230" className={className} aria-hidden>
      <g stroke="#1d1b2a" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
        {/* strings */}
        <path d="M52 52L88 138M100 40L100 120M148 56L112 138" fill="none" strokeWidth={1} />
        {/* balloons */}
        <ellipse cx={52} cy={34} rx={20} ry={24} fill="#d63c62" />
        <ellipse cx={100} cy={22} rx={20} ry={24} fill="#f2a516" />
        <ellipse cx={148} cy={38} rx={20} ry={24} fill="#2c56b8" />
        <path d="M44 24Q42 34 48 42M92 12Q90 22 96 30M140 28Q138 38 144 46" fill="none" strokeWidth={1} opacity={0.6} />
        {/* trunk and roots */}
        <path d="M92 168Q90 190 80 206M108 168Q110 190 122 204M100 170L100 196" fill="#8a5a3b" />
        <path d="M90 150h20v26H90z" fill="#8a5a3b" />
        {/* platform */}
        <path d="M58 150h84v8H58z" fill="#b9854f" />
        {/* house */}
        <path d="M70 150V108h60v42z" fill="#f4d78f" />
        <path d="M62 110L100 80L138 110z" fill="#d63c62" />
        <rect x={92} y={118} width={16} height={18} rx={8} fill="#e6ab2e" />
        <path d="M100 118v18M92 127h16" fill="none" strokeWidth={1} />
        {/* canopy */}
        <circle cx={58} cy={118} r={16} fill="#1b8e8e" />
        <circle cx={144} cy={122} r={14} fill="#1b8e8e" />
        <circle cx={150} cy={104} r={10} fill="#2f9f7a" />
        {/* flag */}
        <path d="M100 80V62" fill="none" />
        <path d="M100 62l16 5-16 5z" fill="#f9a03f" />
        {/* rope ladder */}
        <path d="M122 158V192M134 158V192M122 166h12M122 176h12M122 186h12" fill="none" strokeWidth={1} />
      </g>
    </svg>
  );
}

function SkyJellyfish({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 170" className={className} aria-hidden>
      <g stroke="#1d1b2a" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
        {/* trailing tentacles */}
        {[28, 44, 60, 76, 92].map((x, i) => (
          <motion.path
            key={x}
            d={`M${x} 70Q${x - 8} 96 ${x} 120T${x} 164`}
            fill="none"
            strokeWidth={i % 2 ? 1.2 : 1.6}
            animate={{ d: [`M${x} 70Q${x - 8} 96 ${x} 120T${x} 164`, `M${x} 70Q${x + 8} 96 ${x} 120T${x} 164`] }}
            transition={{ duration: 2.6 + i * 0.3, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
          />
        ))}
        {/* frilly oral arms */}
        <path d="M44 70Q40 100 50 124Q56 100 60 70M60 70Q66 104 76 122Q76 98 76 70" fill="#f9a8c4" opacity={0.8} />
        {/* bell */}
        <path
          d="M10 70C10 28 36 8 60 8S110 28 110 70Q96 62 85 70Q72 62 60 70Q48 62 35 70Q24 62 10 70Z"
          fill="#f07aa8"
        />
        <path d="M30 56Q34 32 54 22" fill="none" stroke="#fdfaf3" strokeWidth={2.5} opacity={0.6} />
        <g fill="#fdfaf3" stroke="none" opacity={0.55}>
          <circle cx={78} cy={34} r={3.5} />
          <circle cx={90} cy={48} r={2.5} />
          <circle cx={64} cy={46} r={2} />
        </g>
      </g>
    </svg>
  );
}

function FlyingTreehouseGrand({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 290" className={className} aria-hidden>
      <g stroke="#1d1b2a" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
        {/* strings */}
        <path d="M48 77L130 110M104 57L130 108M160 61L130 108M214 83L130 110" fill="none" strokeWidth={1} />
        {/* balloons */}
        <ellipse cx={48} cy={50} rx={22} ry={27} fill="#1b8e8e" />
        <ellipse cx={104} cy={30} rx={22} ry={27} fill="#d63c62" />
        <ellipse cx={160} cy={34} rx={22} ry={27} fill="#f2a516" />
        <ellipse cx={214} cy={56} rx={22} ry={27} fill="#6b4aa6" />
        <path
          d="M38 38Q36 50 42 58M94 18Q92 30 98 38M150 22Q148 34 154 42M204 44Q202 56 208 64"
          fill="none"
          strokeWidth={1}
          opacity={0.6}
        />
        <path d="M46 77l4 0M102 57l4 0M158 61l4 0M212 83l4 0" fill="none" />
        {/* trunk and roots */}
        <path
          d="M110 214H150Q150 244 178 270Q150 260 140 254L130 280L122 254Q106 262 82 272Q110 244 110 214Z"
          fill="#8a5a3b"
        />
        <path d="M120 226Q124 240 118 252M138 224Q134 238 140 250" fill="none" strokeWidth={1} />
        {/* rope ladder */}
        <path d="M84 216L78 262M96 216L90 262M82 230h14M81 244h14M79 258h13" fill="none" strokeWidth={1} />
        {/* balcony rail */}
        <path d="M68 194H192M76 194v14M94 194v14M166 194v14M184 194v14" fill="none" strokeWidth={1.2} />
        {/* chimney and smoke */}
        <rect x={148} y={114} width={12} height={24} fill="#b9854f" />
        <path d="M154 112Q148 98 156 90T152 72" fill="none" stroke="#f5efe3" strokeWidth={2} opacity={0.55} />
        {/* walls */}
        <path d="M92 152H168V208H92z" fill="#f4d78f" />
        <path d="M105 152V208M118 152V208M142 152V208M155 152V208" fill="none" strokeWidth={0.8} opacity={0.5} />
        {/* roof with shingles */}
        <path d="M78 154L130 106L182 154z" fill="#d63c62" />
        <path
          d="M96 140Q101 146 106 140M110 128Q115 134 120 128M126 140Q131 146 136 140M140 128Q145 134 150 128M154 140Q159 146 164 140M112 148Q117 154 122 148M138 148Q143 154 148 148"
          fill="none"
          strokeWidth={1}
          opacity={0.7}
        />
        <circle cx={130} cy={136} r={6} fill="#f4d78f" />
        <path d="M130 130v12M124 136h12" fill="none" strokeWidth={0.9} />
        {/* windows and door */}
        <circle cx={106} cy={176} r={8} fill="#e6ab2e" className="animate-twinkle" />
        <path d="M106 168v16M98 176h16" fill="none" strokeWidth={1} />
        <circle cx={154} cy={176} r={8} fill="#e6ab2e" className="animate-twinkle [animation-delay:-2s]" />
        <path d="M154 168v16M146 176h16" fill="none" strokeWidth={1} />
        <path d="M121 208V186Q121 176 130 176Q139 176 139 186V208z" fill="#8a5a3b" />
        <circle cx={135} cy={194} r={1.2} fill="#1d1b2a" />
        {/* platform */}
        <path d="M66 208h128v10H66z" fill="#b9854f" />
        <path
          d="M80 208v10M96 208v10M112 208v10M128 208v10M144 208v10M160 208v10M176 208v10"
          fill="none"
          strokeWidth={0.8}
          opacity={0.5}
        />
        {/* bunting */}
        <path d="M68 220Q130 246 192 220" fill="none" strokeWidth={1} />
        <path
          d="M84 229l5-1-1 9zM104 235l5 0-3 9zM128 238l5 0-2 9zM152 236l5-1-4 9zM172 230l5-2-5 8z"
          fill="#f9a03f"
          strokeWidth={1}
        />
        {/* hanging lanterns */}
        <path d="M70 218v10M190 218v10" fill="none" strokeWidth={1} />
        <rect x={65} y={228} width={10} height={14} rx={2} fill="#f4d78f" />
        <rect x={185} y={228} width={10} height={14} rx={2} fill="#f4d78f" />
        {/* foliage */}
        <circle cx={62} cy={206} r={16} fill="#1b8e8e" />
        <circle cx={50} cy={218} r={11} fill="#2f9f7a" />
        <circle cx={198} cy={204} r={17} fill="#1b8e8e" />
        <circle cx={212} cy={218} r={11} fill="#2f9f7a" />
        <circle cx={94} cy={236} r={9} fill="#2f9f7a" />
        <circle cx={168} cy={240} r={10} fill="#1b8e8e" />
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
          className="absolute top-[28%] left-[15%] hidden w-44 sm:block lg:w-56"
          animate={{ y: [0, -12, 0, 14, 0], rotate: [1.5, -1.5, 1.5] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        >
          <FlyingTreehouseGrand />
        </motion.div>
        <motion.div
          className="absolute top-[11%] right-[5.5rem] w-14 sm:top-[15%] sm:right-[calc(9%+11rem)] sm:w-24"
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
          className="absolute top-[52%] right-[3%] w-20 sm:top-[46%] sm:right-[6%] sm:w-32"
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
