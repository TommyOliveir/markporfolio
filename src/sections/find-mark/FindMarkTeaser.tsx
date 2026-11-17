"use client";

// The window onto "Where's Mark?" under the "Find them in person" card: a framed, live 3D view of
// Molo — the camera slowly circling the plaza, St. Anne's and Molo Mansion with its golden beam — that
// opens the full walk when clicked. The 3D only loads as the frame scrolls near, stops drawing when it's
// out of sight, and gives way to a still picture for reduced motion or browsers without 3D.

import { useInView } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/ui/Reveal";
import { pages, sections } from "@/sections/sections";
import { Game } from "./game";
import { useMedia, useWebGL } from "./support";
import { shop } from "./world";

const Scene = dynamic(() => import("./FindMarkScene"), { ssr: false });

const hours = shop.hours.replace("- ", "–");

const features = [
  {
    title: "The real Molo",
    text: "Every street, building and row of trees, laid out from the map.",
    icon: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6Zm6-2v14m6-12v14",
  },
  {
    title: "Full of life",
    text: "Jeepneys round the plaza, pigeons at the fountain, a sorbetes cart.",
    icon: "M4 15h16v-4l-2-5H6l-2 5v4Zm0 0v2m16-2v2M7 15v-.01M17 15v-.01M4 11h16",
  },
  {
    title: "Never lost",
    text: "Tap “Show me the way” for a golden trail to the mansion.",
    icon: "M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11Zm0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  },
  {
    title: "Then meet him",
    text: `Find Mark up the stairs — then visit for real, ${hours}.`,
    icon: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  },
];

export default function FindMarkTeaser() {
  const frame = useRef<HTMLAnchorElement>(null);
  const near = useInView(frame, { once: true, margin: "400px 0px" });
  const visible = useInView(frame);
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const webgl = useWebGL();
  const [game] = useState(() => new Game({ preview: true }));
  const [mount, setMount] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const off = game.on((e) => {
      if (e.type === "ready") setLive(true);
    });
    return () => {
      off();
      game.dispose();
    };
  }, [game]);

  // Building the town is a moment's work, so wait for a quiet moment once the frame is close.
  useEffect(() => {
    if (!near || reduced || !webgl) return;
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 200));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => setMount(true), { timeout: 1500 });
    return () => cancel(id);
  }, [near, reduced, webgl]);

  return (
    <Reveal className="relative mx-auto mt-20 max-w-5xl sm:mt-28">
      <div className="text-center">
        <p className="caps inline-flex items-center gap-2.5 rounded-full bg-ink px-4 py-1.5 text-[0.66rem] tracking-[0.18em] text-paper">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-rose" />
          </span>
          New · Interactive 3D map
        </p>
        <h3 className="font-display mt-5 text-6xl leading-[0.92] font-semibold italic sm:text-8xl">
          Where&apos;s Mark?
        </h3>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-xl">
          Take a stroll through the real streets of Molo — from the steps of St. Anne&apos;s Church, across the plaza
          past the fountain and the six goddesses, and up the grand staircase of Molo Mansion — to find Mark and his
          postcards.
        </p>
      </div>

      <Link
        ref={frame}
        id={sections.findMark.id}
        href={pages.findMark.path}
        aria-label="Play Where's Mark? — a 3D walk through Molo to Molo Mansion"
        className="group relative mt-10 block scroll-mt-28 rounded-[2rem] border-[10px] border-ink bg-ink shadow-[10px_10px_0_0_var(--color-gold)] transition-[translate,box-shadow] duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[14px_14px_0_0_var(--color-gold)] sm:border-[14px]"
      >
        <div className="relative aspect-4/5 overflow-hidden rounded-[1.3rem] bg-[#f4dcc0] sm:aspect-video">
          <Image
            src="/find-mark-poster.jpg"
            alt="Molo in 3D from the air: St. Anne's Church, Molo Plaza and Molo Mansion under a golden beam"
            fill
            sizes="(min-width: 1024px) 1000px, 100vw"
            className={`object-cover transition-opacity duration-1000 ${live ? "opacity-0" : "opacity-100"}`}
          />
          {mount && (
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <Scene game={game} lite active={visible} />
            </div>
          )}

          {/* the inner gold mat of the frame */}
          <div className="pointer-events-none absolute inset-0 rounded-[1.3rem] ring-2 ring-gold/70 ring-inset" />

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-6">
            <span className="caps inline-flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 text-[0.6rem] tracking-[0.16em] shadow-md backdrop-blur-sm">
              <span className={`size-2 rounded-full ${live ? "animate-pulse bg-rose" : "bg-ink-faint"}`} />
              {live ? "Live 3D" : "3D map"}
            </span>
            <span className="caps hidden rounded-full bg-card/90 px-3 py-1.5 text-[0.6rem] tracking-[0.16em] shadow-md backdrop-blur-sm sm:inline-flex">
              Molo · Iloilo City
            </span>
          </div>

          {/* the big play button */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="relative grid size-20 place-items-center sm:size-28">
              <span className="absolute inset-0 animate-ping rounded-full bg-gold/50 [animation-duration:2.2s]" />
              <span className="relative grid size-full place-items-center rounded-full border-[3px] border-ink bg-gold text-ink shadow-[4px_4px_0_0_var(--color-ink)] transition-transform duration-300 group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="ml-1 size-8 sm:size-11" fill="currentColor" aria-hidden>
                  <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
                </svg>
              </span>
            </span>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/85 via-ink/40 to-transparent px-5 pt-16 pb-5 text-paper sm:px-8 sm:pb-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="caps text-[0.66rem] tracking-[0.18em] text-gold-soft">How to find Mark</p>
                <p className="font-display mt-1 text-3xl leading-tight font-semibold italic sm:text-4xl">
                  Play the walk
                </p>
                <p className="mt-1 text-sm text-paper/85 sm:text-base">About a minute · works on phones too</p>
              </div>
              <span
                aria-hidden
                className="caps hidden items-center gap-2 rounded-full bg-gold px-5 py-3 text-[0.72rem] tracking-[0.18em] text-ink transition-transform group-hover:translate-x-1 sm:inline-flex"
              >
                Start →
              </span>
            </div>
          </div>
        </div>
      </Link>

      <ul className="mt-12 grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
        {features.map((f) => (
          <li key={f.title} className="flex gap-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-ink/25 bg-card text-rose-ink">
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d={f.icon} />
              </svg>
            </span>
            <span>
              <span className="font-display block text-xl leading-tight font-semibold">{f.title}</span>
              <span className="mt-1 block text-[0.95rem] leading-snug text-ink-soft">{f.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
