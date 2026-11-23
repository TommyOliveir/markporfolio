"use client";

// "Where's Mark?" — the page around the 3D walk: the intro card, the controls, the compass and
// minimap, landmark cards as you pass them, and the card that pops up when you find Mark (with the real
// address, opening hours and where to look). Everything the walk tells you is also on the cards, so the
// page still works for anyone who'd rather skip straight to the address.

import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { postcardAlt, postcards } from "@/sections/postcards/content";
import { href, sections } from "@/sections/sections";
import { Game, type BandState, type GuideTo } from "./game";
import Minimap from "./Minimap";
import { useMedia, useWebGL } from "./support";
import { LOST_POSTCARDS, directionsUrl, shop, type Landmark } from "./world";

const Scene = dynamic(() => import("./FindMarkScene"), { ssr: false });

const hours = shop.hours.replace("- ", "–");

// "quest": you brought all the lost postcards back to Mark after already finding him
type Card = "found" | "quest" | null;
const TOTAL_POSTCARDS = LOST_POSTCARDS.length;

// The intro card: a sheet at the bottom on phones, centred on bigger screens, and
// scrollable when the window is too short for them (the auto margins keep the top reachable).
const OVERLAY =
  "absolute inset-0 z-20 flex flex-col items-center overflow-y-auto overscroll-contain bg-linear-to-t from-ink/50 via-ink/15 to-transparent p-3 sm:p-6";
const CARD = "print mt-auto w-full max-w-lg shrink-0 rounded-2xl p-5 sm:mb-auto sm:p-9";

export default function FindMark() {
  const [game] = useState(() => new Game());
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [card, setCard] = useState<Card>(null);
  // how many of Mark's lost postcards you've picked up (the quest)
  const [got, setGot] = useState(0);
  // the quest's story card ("The wind took my postcards!"), when you find Mark; then the counter pulses
  const [story, setStory] = useState(false);
  const [questOn, setQuestOn] = useState(false);
  const storyShown = useRef(false);
  const [pulse, setPulse] = useState(false);
  // the "found him" card's dropdown, with the address and directions
  const [details, setDetails] = useState(false);
  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const [landmarkClosed, setLandmarkClosed] = useState(false);
  // On phones a landmark card shows in full for a few seconds ("auto"), then shrinks to a one-line chip
  // ("mini") so it doesn't hide the place you walked up to; tapping the chip opens it for good ("open").
  const [landmarkView, setLandmarkView] = useState<"auto" | "mini" | "open">("auto");
  // the camera has swooped down from the overview to behind you (phones hold landmark cards until then)
  const [introDone, setIntroDone] = useState(false);
  const [foundOnce, setFoundOnce] = useState(false);
  const [guiding, setGuiding] = useState<GuideTo | null>(null);
  // the marching band by the convent: what it's doing, and whether you're close enough to talk to it
  const [band, setBand] = useState<{ state: BandState; near: boolean }>({ state: "rest", near: false });
  const [muted, setMuted] = useState(false);
  const [help, setHelp] = useState(false);
  const [hint, setHint] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const touch = useMedia("(pointer: coarse)");
  const small = useMedia("(max-width: 700px)");
  const phone = useMedia("(max-width: 639px)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const webgl = useWebGL();
  const stage = useRef<HTMLDivElement>(null);
  const stickBase = useRef<HTMLDivElement>(null);
  const stickKnob = useRef<HTMLDivElement>(null);

  // the band's card takes the landmark card's place while you're with the band
  const showBand = started && !card && !story && band.near && (!phone || introDone);
  const marching = band.state === "gathering" || band.state === "parade";
  const showLandmark =
    !showBand && !story && landmark !== null && !landmarkClosed && (!phone || (introDone && landmark.id !== "mansion"));

  const openStory = useCallback(() => {
    if (storyShown.current) return;
    storyShown.current = true;
    game.hold();
    setStory(true);
  }, [game]);

  const closeStory = useCallback(() => {
    setStory(false);
    setQuestOn(true);
    game.startQuest();
    setPulse(true);
    stage.current?.focus({ preventScroll: true });
  }, [game]);

  // the counter's pulse after the story card
  useEffect(() => {
    if (!pulse) return;
    const id = window.setTimeout(() => setPulse(false), 1800);
    return () => window.clearTimeout(id);
  }, [pulse]);

  // Enter or Escape closes the story card
  useEffect(() => {
    if (!story) return;
    const key = (e: KeyboardEvent) => {
      if (e.code !== "Escape" && e.code !== "Enter") return;
      e.preventDefault();
      closeStory();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [story, closeStory]);

  // phones: shrink the landmark card to a chip after a few seconds, unless it was opened by hand
  useEffect(() => {
    if (!landmark || landmarkClosed || landmarkView !== "auto" || !introDone) return;
    if (!window.matchMedia("(max-width: 639px)").matches) return;
    const id = window.setTimeout(() => setLandmarkView("mini"), 6000);
    return () => window.clearTimeout(id);
  }, [landmark, landmarkClosed, landmarkView, introDone]);

  // news from the scene
  useEffect(() => {
    let celebrate = 0;
    const off = game.on((e) => {
      if (e.type === "ready") setReady(true);
      if (e.type === "intro-done") setIntroDone(true);
      if (e.type === "found") {
        setFoundOnce(true);
        // let the camera swing round and the confetti fly before the card comes up (a little longer on
        // phones, where the card covers more of the view)
        const phone = window.matchMedia("(max-width: 639px)").matches;
        setDetails(false);
        celebrate = window.setTimeout(() => setCard("found"), phone ? 2500 : 1700);
      }
      if (e.type === "landmark") {
        setLandmark(e.landmark);
        setLandmarkClosed(false); // a new place (or coming back to one) shows its card again
        setLandmarkView("auto");
      }
      if (e.type === "postcard") {
        setGot(e.got);
        setNotice(
          e.got === e.total
            ? "All five! Bring them to Mark at Molo Mansion."
            : `Postcard ${e.got} of ${e.total} — ${e.where}`,
        );
      }
      if (e.type === "quest-done") {
        setDetails(false);
        celebrate = window.setTimeout(() => setCard("quest"), 1200);
      }
      if (e.type === "guide") setGuiding(e.on ? e.to : null);
      if (e.type === "band") setBand({ state: e.state, near: e.near });
      if (e.type === "route-failed") setNotice("Can't find a way through from here — try stepping into the open.");
    });
    return () => {
      window.clearTimeout(celebrate);
      off();
      game.dispose();
    };
  }, [game]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(id);
  }, [notice]);

  // the keyboard
  useEffect(() => {
    if (!started) return;
    const down = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el?.closest("input, textarea, select");
      const onControl = el?.closest("button, a") && (e.code === "Enter" || e.code === "Space");
      if (typing || onControl || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "KeyG" && !e.repeat) {
        game.guide(!(game.guiding && game.guideTo === "mark"));
        return;
      }
      if (e.code === "Escape") {
        setHelp(false);
        return;
      }
      game.keys.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => game.keys.delete(e.code);
    const clear = () => game.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [started, game]);

  // the control hints fade after a while
  useEffect(() => {
    if (!started) return;
    const id = window.setTimeout(() => setHint(false), 14000);
    return () => window.clearTimeout(id);
  }, [started]);

  function start() {
    game.begin(reduced);
    game.audio.start();
    game.audio.setMuted(muted);
    setStarted(true);
    stage.current?.focus({ preventScroll: true });
    // with reduced motion there's no swoop down (so no "intro-done" from the scene)
    if (reduced) setIntroDone(true);
  }

  function toggleSound() {
    const m = !muted;
    setMuted(m);
    game.audio.start();
    game.audio.setMuted(m);
  }

  function keepExploring() {
    setCard(null);
    // the first time you leave Mark, he asks you to find the postcards the wind took
    if (card === "found" && !game.questStarted) {
      openStory();
      return;
    }
    game.resume();
    stage.current?.focus({ preventScroll: true });
  }

  // dragging to look round, the thumbstick on phones, pinching and wheeling to zoom, clicking to walk
  const pointers = useRef(
    new Map<
      number,
      { x: number; y: number; sx: number; sy: number; t: number; mode: "look" | "stick"; moved: boolean }
    >(),
  );
  const pinch = useRef(0);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!started || card) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hasStick = [...pointers.current.values()].some((p) => p.mode === "stick");
    const mode =
      e.pointerType === "touch" && !hasStick && x < rect.width * 0.45 && y > rect.height * 0.35 ? "stick" : "look";
    pointers.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      sx: e.clientX,
      sy: e.clientY,
      t: performance.now(),
      mode,
      moved: false,
    });
    e.currentTarget.setPointerCapture(e.pointerId);
    if (mode === "stick" && stickBase.current && stickKnob.current) {
      stickBase.current.style.display = "block";
      stickBase.current.style.transform = `translate(${x - 56}px, ${y - 56}px)`;
      stickKnob.current.style.transform = "translate(0px, 0px)";
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 6) p.moved = true;
    if (p.mode === "stick") {
      let ox = e.clientX - p.sx;
      let oy = e.clientY - p.sy;
      const l = Math.hypot(ox, oy);
      if (l > 56) {
        ox = (ox / l) * 56;
        oy = (oy / l) * 56;
      }
      game.setStick(ox / 56, -oy / 56);
      if (stickKnob.current) stickKnob.current.style.transform = `translate(${ox}px, ${oy}px)`;
      return;
    }
    const looks = [...pointers.current.values()].filter((q) => q.mode === "look");
    if (looks.length === 2) {
      const d = Math.hypot(looks[0].x - looks[1].x, looks[0].y - looks[1].y);
      if (pinch.current) game.zoom(pinch.current / d);
      pinch.current = d;
      return;
    }
    const k = e.pointerType === "touch" ? 0.009 : 0.0055;
    game.look(dx * k, dy * k * 0.7);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const p = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    pinch.current = 0;
    if (!p) return;
    if (p.mode === "stick") {
      game.setStick(0, 0);
      if (stickBase.current) stickBase.current.style.display = "none";
      return;
    }
    if (!p.moved && performance.now() - p.t < 450 && e.type === "pointerup") {
      const rect = e.currentTarget.getBoundingClientRect();
      game.clickAt(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    }
  }

  if (!webgl) return <NoWebGL />;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#f4dcc0] text-ink select-none">
      {/* the 3D walk */}
      <div
        ref={stage}
        tabIndex={-1}
        className={`absolute inset-0 touch-none outline-none ${started && !card ? "cursor-grab active:cursor-grabbing" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => {
          if (started) game.zoom(Math.exp(e.deltaY * 0.0012));
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="A 3D map of Molo Plaza, St. Anne's Church and Molo Mansion"
        role="application"
      >
        <Scene game={game} lite={touch || small} />
      </div>

      {/* the phone thumbstick */}
      <div
        ref={stickBase}
        className="pointer-events-none absolute top-0 left-0 hidden size-28 rounded-full border-2 border-card/80 bg-ink/15 backdrop-blur-sm"
      >
        <div ref={stickKnob} className="absolute top-1/2 left-1/2 -mt-6 -ml-6 size-12 rounded-full bg-card shadow-lg" />
      </div>

      {/* loading */}
      <AnimatePresence>
        {!ready && (
          <motion.div
            key="loading"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-paper"
          >
            <p className="font-script text-4xl text-ink-soft sm:text-5xl">Painting Molo…</p>
            <div className="h-1.5 w-56 overflow-hidden rounded-full bg-paper-deep">
              <motion.div
                className="h-full w-1/3 rounded-full bg-gold"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <p className="caps text-ink-faint">Laying the streets of Molo, brick by brick</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* top bar: back, the compass to Mark, the minimap */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 sm:gap-3 sm:p-5">
        <Link
          href={href(sections.whereToBuy, true)}
          aria-label="Back to the site"
          className="caps pointer-events-auto shrink-0 rounded-full bg-card/90 px-3.5 py-2.5 text-[0.7rem] tracking-[0.16em] whitespace-nowrap shadow-md backdrop-blur-md transition-colors hover:bg-ink hover:text-paper sm:px-4"
        >
          ←<span className="hidden sm:inline"> Back to the site</span>
        </Link>

        <AnimatePresence>
          {started && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl bg-card/90 px-3 py-2 text-center shadow-md backdrop-blur-md sm:px-5 sm:py-2.5"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 whitespace-nowrap sm:gap-2.5">
                <span
                  ref={(el) => game.attachHud("arrow", el)}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-rose text-card"
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                    <path d="M12 2 19 20 12 16 5 20Z" />
                  </svg>
                </span>
                <span className="font-display text-lg leading-none font-semibold italic sm:text-2xl">
                  {foundOnce ? "Found him!" : "Find Mark"}
                </span>
                <span
                  ref={(el) => game.attachHud("distance", el)}
                  className="caps rounded-full bg-paper-deep px-2 py-1 text-[0.62rem] tracking-[0.1em]"
                />
              </div>
              <span className="caps hidden text-[0.6rem] tracking-[0.14em] text-ink-faint sm:block">
                At Molo Mansion · up the stairs
              </span>
              {/* the lost-postcards quest (once Mark has asked): how many you've picked up */}
              {questOn && (
                <motion.span
                  key={pulse ? "pulse" : "still"}
                  animate={pulse && !reduced ? { scale: [1, 1.22, 1, 1.14, 1] } : undefined}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className={`caps inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.58rem] tracking-[0.12em] transition-colors ${
                    got === TOTAL_POSTCARDS || pulse ? "bg-gold text-ink" : "bg-paper-deep text-ink-soft"
                  }`}
                  aria-label={`${got} of ${TOTAL_POSTCARDS} lost postcards found`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <rect x="3" y="5" width="18" height="14" rx="1.5" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                  {got}/{TOTAL_POSTCARDS} postcards
                </motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {started && <Minimap game={game} />}
          <div className="flex gap-2">
            <RoundButton label={muted ? "Turn sound on" : "Turn sound off"} onClick={toggleSound}>
              {muted ? (
                <path d="M11 5 6 9H3v6h3l5 4V5Zm5.5 4.5 5 5m0-5-5 5" />
              ) : (
                <path d="M11 5 6 9H3v6h3l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
              )}
            </RoundButton>
            {started && (
              <RoundButton label="How to play" onClick={() => setHelp((h) => !h)}>
                <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14m0 3.5v.01" />
              </RoundButton>
            )}
          </div>
        </div>
      </div>

      {/* the card for the landmark you're passing: under the top bar on phones (clear of your thumb),
          bottom left on bigger screens. Only its buttons catch clicks or touches; closing it hides it
          until you reach the next landmark, so you can take in the view. On phones it shrinks to a chip
          after a few seconds (see landmarkView), waits for the intro swoop to land, and skips the
          mansion (the "found him" card already tells that story). */}
      <div className="pointer-events-none absolute inset-x-3 top-48 z-10 sm:top-auto sm:right-auto sm:bottom-16 sm:left-5 sm:w-96">
        <AnimatePresence mode="wait">
          {/* phones: just a one-line chip, so the band stays in view (the full card is for bigger screens) */}
          {showBand && phone && (
            <motion.div
              key={`band-chip-${marching}`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto w-fit"
            >
              <motion.button
                type="button"
                onClick={() => game.askBand(!marching)}
                onPointerDown={(e) => e.stopPropagation()}
                // a gentle pulse in time with the music while they're marching
                animate={marching && !reduced ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                transition={marching && !reduced ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" } : {}}
                aria-label={marching ? "Tell the band to stop" : "Ask the band to play"}
                className={`pointer-events-auto flex h-11 items-center gap-2 rounded-full px-5 text-[0.7rem] tracking-[0.14em] uppercase shadow-lg ${marching ? "bg-ink text-paper" : "bg-gold text-ink"}`}
              >
                <span aria-hidden>{marching ? "■" : "♪"}</span>
                {marching ? "Stop the band" : "Play band"}
                {marching && muted && <span className="normal-case tracking-normal opacity-75">(sound off)</span>}
              </motion.button>
            </motion.div>
          )}
          {showBand && !phone && (
            <motion.div
              key="band"
              initial={{ opacity: 0, y: 16, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="print relative rounded-xl p-3.5 sm:p-5"
              aria-live="polite"
            >
              <p className="caps text-[0.6rem] text-rose-ink">{marching ? "On parade" : "By the convent"}</p>
              <p className="font-display mt-0.5 text-xl leading-tight font-semibold sm:mt-1 sm:text-[1.7rem]">
                The Molo marching band
              </p>
              <p className="mt-1 text-sm leading-snug text-ink-soft sm:mt-1.5 sm:text-base">
                {marching
                  ? "Trumpets, trombones, sousaphones and drums, marching up and down in front of St. Anne's."
                  : "Twenty bandsmen at ease beside St. Anne's. Ask them for a tune and they'll march it down Jocson Street."}
              </p>
              {marching && muted && (
                <p className="mt-2 text-xs text-rose-ink sm:text-sm">Turn the sound on to hear them.</p>
              )}
              <button
                type="button"
                onClick={() => game.askBand(!marching)}
                onPointerDown={(e) => e.stopPropagation()}
                className={`btn ${marching ? "btn-ink" : "btn-gold"} pointer-events-auto mt-3 w-full px-4 text-[0.68rem] tracking-[0.12em] sm:w-auto sm:text-[0.75rem] sm:tracking-[0.18em]`}
              >
                <span aria-hidden>{marching ? "■" : "♪"}</span>
                {marching ? "Tell them to stop" : "Play band"}
              </button>
            </motion.div>
          )}
          {showLandmark && landmarkView === "mini" && (
            <motion.div
              key={`${landmark.id}-mini`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-fit max-w-full"
            >
              <button
                type="button"
                onClick={() => setLandmarkView("open")}
                onPointerDown={(e) => e.stopPropagation()}
                aria-expanded={false}
                aria-label={`Show the card about ${landmark.title}`}
                className="pointer-events-auto flex h-11 max-w-full items-center gap-2 rounded-full bg-card/95 pr-3 pl-4 shadow-md backdrop-blur-md"
              >
                <span className="caps shrink-0 text-[0.55rem] text-rose-ink">{landmark.kicker}</span>
                <span className="font-display truncate text-base font-semibold">{landmark.title}</span>
                {landmark.music && !muted && (
                  <span aria-hidden className={`text-rose-ink ${reduced ? "" : "animate-pulse"}`}>
                    ♪
                  </span>
                )}
                <svg
                  viewBox="0 0 24 24"
                  className="size-4 shrink-0 text-ink-soft"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </motion.div>
          )}
          {showLandmark && landmarkView !== "mini" && (
            <motion.div
              key={landmark.id}
              initial={{ opacity: 0, y: 16, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="print relative rounded-xl p-3.5 pr-12 sm:p-5 sm:pr-14"
              aria-live="polite"
            >
              <button
                type="button"
                // closing the card leaves its music on: it plays for as long as you're in the area, and
                // fades out when you walk away (see walk.ts)
                onClick={() => setLandmarkClosed(true)}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label={`Close the card about ${landmark.title}`}
                title="Close"
                className="pointer-events-auto absolute top-1 right-1 grid size-11 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink sm:top-2 sm:right-2"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
              <p className="caps text-[0.6rem] text-rose-ink">{landmark.kicker}</p>
              <p className="font-display mt-0.5 text-xl leading-tight font-semibold sm:mt-1 sm:text-[1.7rem]">
                {landmark.title}
              </p>
              <p className="mt-1 text-sm leading-snug text-ink-soft sm:mt-1.5 sm:text-base">{landmark.text}</p>
              {landmark.music && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-ink sm:text-sm">
                  <span aria-hidden className={reduced ? "" : "animate-pulse"}>
                    ♪
                  </span>
                  {muted
                    ? `Turn the sound on to hear ${landmark.music.title}.`
                    : `Now playing ${landmark.music.title}.`}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* bottom: notices, the map credit, hints, the "show me the way" button */}
      {/* on phones the two route buttons share a full-width row, with the notices and map credit under
          them; from sm up the credit sits bottom left and the buttons stack bottom right */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col-reverse gap-2 p-3 sm:flex-row sm:items-end sm:justify-between sm:gap-3 sm:p-5">
        <div className="flex max-w-sm flex-col gap-2">
          <AnimatePresence>
            {notice && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-full bg-ink/85 px-4 py-2 text-sm text-paper"
              >
                {notice}
              </motion.p>
            )}
          </AnimatePresence>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto w-fit rounded-full bg-card/70 px-2.5 py-1 text-[0.62rem] whitespace-nowrap text-ink-soft backdrop-blur-sm hover:text-ink sm:text-[0.68rem]"
          >
            <span className="hidden sm:inline">Map data </span>© OpenStreetMap contributors
          </a>
        </div>

        {started && !card && !story && (
          <div className="pointer-events-auto flex gap-2 sm:shrink-0 sm:flex-col sm:items-end">
            <AnimatePresence>
              {hint && !touch && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="caps hidden rounded-full bg-ink/80 px-4 py-2 text-[0.6rem] tracking-[0.14em] text-paper lg:block"
                >
                  WASD to walk · Shift to run · Space to jump · drag to look · click to walk there
                </motion.p>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => game.guide(guiding !== "mark")}
              className={`btn ${guiding === "mark" ? "btn-ink" : "btn-gold"} px-3 text-[0.68rem] tracking-[0.12em] whitespace-nowrap shadow-lg max-sm:flex-1 max-sm:gap-2 sm:px-[1.6rem] sm:text-[0.78rem] sm:tracking-[0.2em]`}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11Z" />
                <circle cx="12" cy="10" r="2.2" />
              </svg>
              {guiding === "mark" ? (
                <>
                  Hide <span className="hidden sm:inline">the</span> trail
                </>
              ) : (
                <>
                  <span className="sm:hidden">Way to Mark</span>
                  <span className="hidden sm:inline">Show me the way</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => game.guide(guiding !== "supermart", "supermart")}
              className={`btn ${guiding === "supermart" ? "btn-ink" : "btn-line bg-card/95 backdrop-blur-sm"} px-3 text-[0.68rem] tracking-[0.12em] whitespace-nowrap shadow-lg max-sm:flex-1 max-sm:gap-2 sm:px-[1.6rem] sm:text-[0.78rem] sm:tracking-[0.2em]`}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2" />
                <circle cx="9.5" cy="19" r="1.4" />
                <circle cx="17" cy="19" r="1.4" />
              </svg>
              {guiding === "supermart" ? (
                <>
                  Hide <span className="hidden sm:inline">the</span> trail
                </>
              ) : (
                <>
                  <span className="sm:hidden">Supermart</span>
                  <span className="hidden sm:inline">Go to Iloilo Supermart</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* how to play */}
      <AnimatePresence>
        {help && started && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="print absolute top-1/2 left-1/2 z-20 w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6"
            role="dialog"
            aria-label="How to play"
          >
            <p className="font-display text-3xl font-semibold italic">How to get around</p>
            <Controls touch={touch} />
            <button type="button" onClick={() => setHelp(false)} className="btn btn-ink mt-6 w-full">
              Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* the intro card */}
      <AnimatePresence>
        {ready && !started && !card && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={OVERLAY}
          >
            <motion.div
              initial={{ y: 30, rotate: -1.5 }}
              animate={{ y: 0, rotate: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className={CARD}
            >
              <p className="caps text-rose-ink">A little walk through Molo</p>
              <h1 className="font-display mt-3 text-6xl leading-[0.9] font-semibold italic sm:text-7xl">
                Where&apos;s Mark?
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-ink-soft">
                He&apos;s somewhere round Molo Plaza with a stack of postcards. Start on the steps of St. Anne&apos;s
                Church, wander across the plaza — past the fountain and the six goddesses — and find him.
              </p>
              <p className="font-script mt-3 text-xl text-ink-soft">The real streets of Molo, in miniature.</p>
              <Controls touch={touch} />
              <button type="button" onClick={start} className="btn btn-gold mt-7" autoFocus>
                Start walking
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* the quest's story: a gust blows Mark's postcards away, then a strip asking you to find them */}
      <AnimatePresence>{story && <StoryCard onClose={closeStory} reduced={reduced} />}</AnimatePresence>

      {/* found him! A compact card at the edge of the screen, not a modal, so Mark stays in view: across the
          top on upright screens (the camera frames Mark low on those, see walk.ts) and in the top-left
          corner on wide ones (framed a little right of centre). "Details" drops the address and directions
          down inside the card, scrolling within it rather than growing over him. */}
      <AnimatePresence>
        {card && (
          <motion.div
            key="found"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="print absolute z-20 flex max-h-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl portrait:inset-x-3 portrait:top-3 portrait:mx-auto portrait:max-w-lg landscape:top-3 landscape:left-3 landscape:w-80 sm:landscape:top-20 sm:landscape:left-5 sm:landscape:w-96"
            role="dialog"
            aria-labelledby="found-title"
          >
            <div className="shrink-0 p-4 sm:p-5">
              <p className="caps text-[0.62rem] text-rose-ink">
                {card === "quest" ? "Quest complete!" : "You found him!"}
              </p>
              <h2
                id="found-title"
                className="font-display mt-1 text-2xl leading-tight font-semibold italic sm:text-[2rem]"
              >
                {card === "quest" ? "All his postcards, home" : "Mark\u2019s at Molo Mansion"}
              </h2>
              <p className="mt-1 text-sm leading-snug text-ink-soft sm:text-base">
                Postcards on sale in person, {hours}.
              </p>
              {card === "quest" && <PostcardsReward />}
              <div className="mt-3 flex gap-2 sm:mt-4">
                <button
                  type="button"
                  onClick={() => setDetails((d) => !d)}
                  aria-expanded={details}
                  aria-controls="found-details"
                  className="btn btn-line flex-1 gap-1.5 px-3 text-[0.68rem] tracking-[0.12em] whitespace-nowrap"
                >
                  Details
                  <svg
                    viewBox="0 0 24 24"
                    className={`size-4 transition-transform ${details ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={keepExploring}
                  className="btn btn-gold flex-1 px-3 text-[0.68rem] tracking-[0.12em] whitespace-nowrap"
                  autoFocus
                >
                  Keep exploring
                </button>
              </div>
            </div>
            <AnimatePresence initial={false}>
              {details && (
                <motion.div
                  id="found-details"
                  key="details"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="min-h-0 overflow-hidden border-t border-ink/15"
                >
                  <div className="max-h-[34vh] overflow-y-auto overscroll-contain px-4 pt-3 pb-4 landscape:max-h-[calc(100vh-15rem)] sm:px-5">
                    <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
                      Come and find the real thing: Mark&apos;s postcards are on sale at the mansion, in ink and
                      watercolour, printed on heavy card. Not sold online — so say hi in person.
                    </p>
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                      <dt className="caps pt-0.5 text-[0.6rem] text-ink-faint">Where</dt>
                      <dd>{shop.address}</dd>
                      <dt className="caps pt-0.5 text-[0.6rem] text-ink-faint">When</dt>
                      <dd>{hours}</dd>
                      <dt className="caps pt-0.5 text-[0.6rem] text-ink-faint">Look for</dt>
                      <dd>
                        The cream mansion with the red dome, across Lopez Jaena Street from Molo Plaza — St. Anne&apos;s
                        twin spires are on the far side of the square.
                      </dd>
                    </dl>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <noscript>
        <p className="absolute inset-x-4 top-20 rounded-xl bg-card p-5">
          Mark&apos;s postcards are at Molo Mansion, {shop.address}, {hours}.
        </p>
      </noscript>
    </div>
  );
}

/**
 * The lost-postcards story, as you land: five little postcards blow across the screen and away on a
 * gust (they just sit in a loose fan for visitors who prefer less motion), over a card that says what
 * happened and how to find them.
 */
function StoryCard({ onClose, reduced }: { onClose: () => void; reduced: boolean }) {
  const stamps = postcards.map((c) => c.stampColor);
  // where each card blows to (as % of the screen, from the middle), and how far it spins
  const width = window.innerWidth;
  const height = window.innerHeight;
  const flights = [
    [-62, -18, -220],
    [58, -26, 260],
    [-48, 14, 180],
    [66, 6, -300],
    [-70, -4, 320],
  ];
  return (
    <motion.div
      key="story"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col items-center bg-linear-to-t from-ink/35 via-transparent to-transparent p-3 sm:p-6"
      role="dialog"
      aria-labelledby="story-title"
    >
      {/* a compact strip along the bottom, so Mark (and the confetti) stay in full view above it */}
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, delay: reduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="print mt-auto w-full max-w-2xl shrink-0 rounded-2xl p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div className="min-w-0 flex-1">
            <p className="caps text-[0.62rem] text-rose-ink">Mark needs a hand</p>
            <h2 id="story-title" className="font-display mt-1 text-2xl leading-tight font-semibold italic sm:text-3xl">
              &ldquo;The wind took my postcards!&rdquo;
            </h2>
            <p className="mt-1 text-sm leading-snug text-ink-soft sm:text-base">
              &ldquo;A gust blew {TOTAL_POSTCARDS} of them across Molo. Could you bring them back here?&rdquo;
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-faint sm:text-sm">
              <svg
                viewBox="0 0 24 24"
                className="size-4 shrink-0 text-gold"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M12 3v18M8 7l4-4 4 4" />
              </svg>
              Look for gold beams of light; the map shows where.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-gold w-full shrink-0 px-5 whitespace-nowrap sm:w-auto"
            autoFocus
          >
            I&apos;ll find them
          </button>
        </div>
      </motion.div>
      {/* the gust, over the card */}
      <div className="pointer-events-none absolute inset-x-0 top-[16%] z-10 flex h-0 justify-center" aria-hidden>
        {!reduced && (
          <svg viewBox="0 0 400 120" className="absolute -top-14 h-28 w-[min(90vw,40rem)]" fill="none">
            {["M10 40 Q120 10 230 40 T390 30", "M30 75 Q150 50 260 78 T395 70", "M60 100 Q170 85 280 104"].map(
              (d, i) => (
                <motion.path
                  key={d}
                  d={d}
                  stroke="#fdfaf3"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0.9 }}
                  animate={{ pathLength: 1, opacity: 0 }}
                  transition={{ duration: 1.3, delay: i * 0.15, ease: "easeOut" }}
                />
              ),
            )}
          </svg>
        )}
        {flights.map(([vx, vy, spin], i) => {
          const fan = { x: (i - 2) * 52, y: Math.abs(i - 2) * 8, rotate: (i - 2) * 9 };
          return (
            <motion.div
              key={i}
              className="absolute h-11 w-16 rounded-sm border border-ink/10 bg-[#fbf5e6] shadow-lg"
              initial={reduced ? fan : { x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.6 }}
              animate={
                reduced
                  ? fan
                  : {
                      x: [0, vx * 3, (vx / 100) * width],
                      y: [0, vy * 3 - 30, (vy / 100) * height],
                      rotate: [0, spin / 3, spin],
                      scale: [0.6, 1.1, 1],
                      opacity: [1, 1, 0],
                    }
              }
              transition={{ duration: 1.7, delay: 0.3 + i * 0.09, ease: "easeOut" }}
            >
              <span
                className="absolute top-1 right-1 h-3 w-2.5 rounded-[1px]"
                style={{ background: stamps[i % stamps.length] }}
              />
              <span className="absolute top-2 left-1.5 h-px w-6 bg-ink/30" />
              <span className="absolute top-4 left-1.5 h-px w-8 bg-ink/30" />
              <span className="absolute top-6 left-1.5 h-px w-5 bg-ink/30" />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/** The quest's reward: Mark's real postcards, and a link to see them all on the site. */
function PostcardsReward() {
  const real = postcards.filter((c) => !c.draft);
  return (
    <div className="mt-4 flex items-center gap-4 rounded-xl bg-paper-deep p-3">
      <div className="flex shrink-0 -space-x-6">
        {real.slice(0, 3).map((c, i) => (
          <Image
            key={c.slug}
            src={c.src}
            alt={postcardAlt(c)}
            width={c.size?.width ?? 1200}
            height={c.size?.height ?? 800}
            sizes="80px"
            className={`h-24 w-auto rounded border-4 border-card shadow-md ${i % 2 ? "rotate-3" : "-rotate-3"}`}
          />
        ))}
      </div>
      <p className="text-base leading-snug text-ink-soft">
        You collected every postcard the wind blew away. The real ones are on sale at the mansion.{" "}
        <Link href={href(sections.postcards, true)} className="font-semibold text-rose-ink underline">
          See Mark&apos;s postcards
        </Link>
      </p>
    </div>
  );
}

function Controls({ touch }: { touch: boolean }) {
  const rows = touch
    ? [
        ["Left thumb", "walk (push far to run)"],
        ["Drag", "look around"],
        ["Pinch", "zoom"],
        ["Tap", "walk there"],
      ]
    : [
        ["W A S D", "walk (arrows work too)"],
        ["Shift", "run"],
        ["Space", "jump"],
        ["Drag · wheel", "look around · zoom"],
        ["Click", "walk there"],
        ["G", "show me the way"],
      ];
  return (
    <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.95rem]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="caps self-center rounded bg-paper-deep px-2 py-1 text-center text-[0.6rem] tracking-[0.12em]">
            {k}
          </dt>
          <dd className="self-center text-ink-soft">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-10 items-center justify-center rounded-full bg-card/90 shadow-md backdrop-blur-md transition-colors hover:bg-ink hover:text-paper"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </button>
  );
}

// For browsers without 3D graphics: the same directions, with Google's map.
function NoWebGL() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="print w-full max-w-xl rounded-2xl p-6 sm:p-9">
        <p className="caps text-rose-ink">Where&apos;s Mark?</p>
        <h1 className="font-display mt-3 text-5xl font-semibold italic">Mark&apos;s at Molo Mansion</h1>
        <p className="mt-4 text-lg text-ink-soft">
          This browser can&apos;t show the 3D walk, but here&apos;s the way: {shop.address}, {hours}. It faces Molo
          Plaza across Lopez Jaena Street.
        </p>
        <iframe
          title={`Map showing ${shop.name}`}
          src={shop.mapEmbedUrl}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="mt-6 aspect-4/3 w-full rounded-lg border border-ink/20"
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-gold">
            Get directions
          </a>
          <Link href={href(sections.whereToBuy, true)} className="btn btn-line">
            Back to the site
          </Link>
        </div>
      </div>
    </div>
  );
}
