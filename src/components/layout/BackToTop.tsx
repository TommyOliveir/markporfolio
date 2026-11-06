"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { href, sections } from "@/sections/sections";

// Floating button that appears once the hero is scrolled away and takes the visitor back up.
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          href={href(sections.top)}
          aria-label="Back to top"
          title="Back to top"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed right-4 bottom-4 z-30 sm:right-6 sm:bottom-6"
        >
          <span className="btn btn-gold size-12 p-0">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
              <path
                d="M12 19V5M5.5 11.5 12 5l6.5 6.5"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}
