"use client";

import { useState } from "react";
import { site } from "@/data/site";
import { Balloon, Flourish } from "./Ornaments";
import Reveal from "./Reveal";
import Watercolor from "./Watercolor";

const steps = [
  {
    title: "Get in touch",
    text: "Call or message. Tell me who it's for, the size you have in mind, and when you need it.",
    color: "text-rose",
  },
  {
    title: "Share the place",
    text: "Your street, a city you loved, the harbour where you met — plus any wonders you'd like to drift in.",
    color: "text-marigold",
  },
  {
    title: "Watch it come alive",
    text: "I'll send the pencil sketch, then the ink, then the colour, until it feels exactly right.",
    color: "text-teal",
  },
];

function Sun({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <g stroke="#1d1b2a" strokeWidth={1.6} strokeLinecap="round">
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <path
              key={i}
              d={`M${50 + Math.cos(a) * 30} ${50 + Math.sin(a) * 30}L${50 + Math.cos(a) * 44} ${50 + Math.sin(a) * 44}`}
            />
          );
        })}
        <circle cx="50" cy="50" r="22" fill="#f4c24f" />
      </g>
    </svg>
  );
}

export default function Commission() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(site.phoneDisplay);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — the number is visible anyway.
    }
  }

  return (
    <section
      id="commission"
      className="relative overflow-hidden bg-linear-to-b from-azure to-azure-soft px-4 py-32 text-ink sm:px-6"
    >
      {/* sunny watercolour sky */}
      <Watercolor
        seed={14}
        softness={18}
        // Normal blend: multiplying warm pigments over blue would turn them muddy.
        blend="normal"
        blooms={[
          { x: 6, y: 10, r: 22, color: "#f07aa8", opacity: 0.35 },
          { x: 94, y: 22, r: 20, color: "#f4c24f", opacity: 0.4 },
          { x: 90, y: 88, r: 22, color: "#f07aa8", opacity: 0.3 },
          { x: 10, y: 80, r: 16, color: "#f4c24f", opacity: 0.32 },
        ]}
      />
      <Sun className="absolute top-10 right-[8%] size-20 animate-[spin_60s_linear_infinite] sm:size-28" />
      <div className="absolute top-8 left-[6%] w-10 animate-drift sm:w-14 lg:top-[18%] lg:left-[5%] [animation-duration:17s]">
        <Balloon a="#d63c62" b="#f2a516" />
      </div>
      <div className="absolute top-[52%] right-[4%] hidden w-11 animate-drift md:block [animation-delay:-6s] [animation-duration:21s]">
        <Balloon a="#1b8e8e" b="#f4d78f" />
      </div>

      <Reveal className="relative mx-auto max-w-5xl">
        <div className="text-center">
          <p className="caps text-rose">IV &nbsp;·&nbsp; Commissions open</p>
          <h2 className="font-display mx-auto mt-4 max-w-3xl text-5xl leading-[1.02] font-medium text-balance sm:text-6xl">
            Your city, your sea, <em className="text-rose">your daydream</em>
          </h2>
          <Flourish className="mx-auto mt-5 w-44 text-ink/50" />
          <p className="mx-auto mt-5 max-w-xl text-xl text-ink-soft italic">
            An original ink, acrylic or watercolour piece made just for you — or for someone who deserves a little magic
            on their wall.
          </p>
        </div>

        <ol className="mt-20 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-3xl bg-card/80 p-7 shadow-[0_10px_30px_-15px_rgb(29_27_42/0.35)]">
              <span className={`font-display text-6xl leading-none font-semibold italic ${s.color}`}>
                {["I", "II", "III"][i]}
              </span>
              <h3 className="font-display mt-4 text-3xl">{s.title}</h3>
              <p className="mt-2 text-ink-soft">{s.text}</p>
            </li>
          ))}
        </ol>

        {/* Call card: rounded double border */}
        <div className="relative mt-20 rounded-[2.5rem] border-2 border-ink/15 p-2">
          <div className="rounded-[2rem] border border-ink/10 bg-card px-4 py-12 text-center shadow-[0_20px_50px_-25px_rgb(29_27_42/0.4)] sm:px-10">
            <Sun className="mx-auto size-12" />
            <p className="caps mt-5 text-ink-faint">Call or message me on my cell</p>
            <a
              href={`tel:${site.phoneRaw}`}
              className="font-display mt-3 inline-block text-[clamp(2rem,7vw,4.5rem)] leading-tight whitespace-nowrap transition-colors hover:text-rose"
            >
              {site.phoneDisplay}
            </a>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a href={`tel:${site.phoneRaw}`} className="btn rounded-full bg-marigold text-ink after:border-marigold">
                Call
              </a>
              <a href={`sms:${site.phoneRaw}`} className="btn btn-line rounded-full">
                Text
              </a>
              {site.messenger && (
                <a
                  href={site.messenger}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-line rounded-full"
                >
                  Messenger
                </a>
              )}
            </div>
            <button onClick={copy} className="caps ink-link mt-6 pb-1 text-ink-faint hover:text-ink">
              {copied ? "Copied ✓" : "Copy number"}
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
