"use client";

import { AnimatePresence, motion } from "motion/react";
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
    } catch {
      // The Clipboard API needs https (e.g. not available over http://<local-ip> while testing on a phone),
      // so fall back to the old select-and-copy trick.
      const field = document.createElement("textarea");
      field.value = site.phoneDisplay;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      const ok = document.execCommand("copy");
      field.remove();
      if (!ok) return; // the number is visible anyway
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
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
            <div>
              <CopyNumber copied={copied} onCopy={copy} />
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {site.messenger && (
                <a
                  href={site.messenger}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn rounded-full bg-marigold text-ink after:border-marigold"
                >
                  Message on Messenger
                </a>
              )}
              {site.contactEmail && (
                // Opens a new email in Gmail on the web (Gmail's own compose link), in a new tab.
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(site.contactEmail)}&su=${encodeURIComponent(`Commission enquiry via ${site.artist}'s website`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-line rounded-full"
                >
                  Email me
                </a>
              )}
            </div>
            {site.contactEmail && (
              <p className="mt-5 text-ink-soft">
                or write to{" "}
                <a href={`mailto:${site.contactEmail}`} className="ink-link pb-0.5 text-ink hover:text-rose">
                  {site.contactEmail}
                </a>
              </p>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// "copy my number" written by hand, with an inked arrow curling up to the number above it.
function CopyNumber({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="group mt-1 inline-flex cursor-pointer items-end gap-1.5 rounded-full px-3 py-1 text-ink-soft transition-colors hover:text-rose focus-visible:text-rose"
    >
      <svg
        viewBox="0 0 60 40"
        className="mb-2 h-8 w-12 origin-bottom-right transition-transform duration-300 group-hover:-translate-y-1 group-hover:-rotate-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M57 35C44 37 30 33 22 24S13 10 14 5" />
        <path d="M8 13L14 4L20 12" />
      </svg>

      <span className="font-script relative text-2xl leading-none" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? "done" : "copy"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="inline-block"
          >
            {copied ? "copied — talk soon!" : "copy my number"}
          </motion.span>
        </AnimatePresence>
        {/* nib-drawn underline that pulls across on hover */}
        <svg
          viewBox="0 0 120 8"
          preserveAspectRatio="none"
          className="absolute inset-x-0 -bottom-2 h-2 w-full"
          aria-hidden
        >
          <path
            d="M2 5C30 2 60 7 118 3"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeLinecap="round"
            pathLength={1}
            className="[stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] duration-500 group-hover:[stroke-dashoffset:0]"
          />
        </svg>
      </span>

      <svg
        viewBox="0 0 24 24"
        className="mb-0.5 size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {copied ? (
          <motion.path
            d="M4 13l5 5L20 6"
            strokeWidth={2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        ) : (
          <>
            {/* a little sketched clipboard */}
            <path d="M8 5H6.5C5.7 5 5 5.7 5 6.6L5.3 19.5C5.3 20.3 6 21 6.8 21H17.3C18.1 21 18.8 20.3 18.8 19.5L19 6.5C19 5.7 18.3 5 17.5 5H16" />
            <path d="M9 3.5H15V7H9Z" />
            <path d="M8.5 11.5H15.5M8.5 15H13.5" strokeWidth={1.2} />
          </>
        )}
      </svg>
    </button>
  );
}
