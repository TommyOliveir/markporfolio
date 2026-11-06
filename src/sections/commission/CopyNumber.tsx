"use client";

import { AnimatePresence, motion } from "motion/react";

// "copy my number" written by hand, with an inked arrow curling up to the number above it.
export default function CopyNumber({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
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
