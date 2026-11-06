"use client";

import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { useEffect, useState, type MouseEvent } from "react";
import { href, navSections, sections } from "@/sections/sections";

// Nav links and the shop pill come from the sections list, so they always match the page's anchors.
const links = navSections.map((s) => ({ href: href(s), label: s.label }));

// Highlighted link to the in-person shop in the postcards section.
const shop = {
  href: href(sections.whereToBuy),
  label: sections.whereToBuy.label, // mobile menu has room for the full wording
  short: sections.whereToBuy.short, // desktop pill
};

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 25 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const light = !scrolled && !open;

  // Mobile menu links scroll explicitly: closing the menu on tap could swallow the
  // browser's own jump to the anchor, leaving the page where it was.
  function goTo(e: MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    setOpen(false);
    history.pushState(null, "", href);
    requestAnimationFrame(() => document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <>
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gold" />

      <header
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-500 ${
          light ? "text-paper" : "border-b border-ink/10 bg-paper/90 text-ink backdrop-blur-md"
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 pt-8 pb-5 sm:px-8">
          {/* Site name; takes you back to the top of the homepage */}
          <a
            href={href(sections.top)}
            title="Back to the top"
            className="font-display text-3xl font-medium whitespace-nowrap italic"
          >
            Flying Treehouse
          </a>

          <ul className="hidden items-center gap-6 xl:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="caps ink-link pb-1 text-[0.82rem] tracking-[0.16em] opacity-80 transition-opacity hover:opacity-100"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={shop.href}
                title={shop.label}
                // Bigger, bolder and less letter-spaced than the other nav labels so it reads at a glance.
                className="font-caps rounded-full bg-gold px-5 py-2.5 text-[0.88rem] font-bold tracking-[0.08em] text-ink uppercase shadow-sm transition-transform hover:-translate-y-0.5"
              >
                {shop.short}
              </a>
            </li>
            <li>
              <a
                href={href(sections.commission)}
                className={`caps rounded-full border px-5 py-2.5 text-[0.82rem] transition-colors ${
                  light
                    ? "border-paper/50 hover:bg-paper hover:text-ink"
                    : "border-ink/40 hover:bg-ink hover:text-paper"
                }`}
              >
                Commission
              </a>
            </li>
          </ul>

          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Menu"
            className="grid size-11 place-items-center xl:hidden"
          >
            <span className="relative block h-3 w-6">
              <span
                className={`absolute inset-x-0 top-0 h-px bg-current transition-transform ${open ? "translate-y-1.5 rotate-45" : ""}`}
              />
              <span
                className={`absolute inset-x-0 bottom-0 h-px bg-current transition-transform ${open ? "-translate-y-1.5 -rotate-45" : ""}`}
              />
            </span>
          </button>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-ink/10 px-4 xl:hidden"
            >
              <li className="border-b border-ink/10 py-3">
                <a
                  href={shop.href}
                  onClick={(e) => goTo(e, shop.href)}
                  className="font-display block rounded-xl bg-gold px-4 py-3 text-2xl font-semibold text-ink italic"
                >
                  {shop.label}
                </a>
              </li>
              {[...links, { href: href(sections.commission), label: "Commission a piece" }].map((l) => (
                <li key={l.href} className="border-b border-ink/10 last:border-0">
                  <a href={l.href} onClick={(e) => goTo(e, l.href)} className="font-display block py-4 text-2xl italic">
                    {l.label}
                  </a>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
