// What the visitor's browser and settings allow: 3D graphics, touch, small screens, less motion.

import { useSyncExternalStore } from "react";

/** A media query as live state. False during the server render, then the real answer. */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// Checked once: each check opens a WebGL context, and browsers only allow a handful.
let webglSupport: boolean | null = null;
function hasWebGL() {
  if (webglSupport === null) {
    try {
      const gl =
        document.createElement("canvas").getContext("webgl2") ?? document.createElement("canvas").getContext("webgl");
      webglSupport = !!gl;
      gl?.getExtension("WEBGL_lose_context")?.loseContext(); // let it go straight away
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

/** Can this browser draw 3D? (Assumed yes during the server render.) */
export function useWebGL() {
  return useSyncExternalStore(
    () => () => {},
    hasWebGL,
    () => true,
  );
}
