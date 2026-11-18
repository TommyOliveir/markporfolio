"use client";

import { useEffect } from "react";

// Makes shared section links (e.g. …/#find-mark posted on Facebook) land where they point.
// On a fresh visit the browser jumps to the anchor once, straight away — before fonts, photos and
// the 3D bands have settled — so the section it was aiming for drifts down and you end up above it
// (in-app browsers like Facebook's, on a slow connection, are the worst for this). So: jump again
// whenever the page's height changes while it settles (for up to 10 seconds), and stop the moment
// the visitor starts scrolling themselves.
export default function HashScroll() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    let done = false;
    const stop = () => {
      done = true;
    };
    const go = () => {
      if (done) return;
      // "instant": the page's smooth scrolling is unreliable in some in-app browsers
      document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
    };

    go();
    // anything above the section growing or shrinking (photos, fonts, the 3D bands) moves it
    let frame = 0;
    const resized = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(go);
    });
    resized.observe(document.body);
    document.fonts?.ready.then(go);
    window.addEventListener("load", go);
    const finish = window.setTimeout(stop, 10000);
    const userInput = ["wheel", "touchstart", "keydown", "mousedown"] as const;
    userInput.forEach((type) => window.addEventListener(type, stop, { passive: true, once: true }));

    return () => {
      done = true;
      resized.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(finish);
      window.removeEventListener("load", go);
      userInput.forEach((type) => window.removeEventListener(type, stop));
    };
  }, []);

  return null;
}
