"use client";

import { useEffect } from "react";

// Deters casual saving of artwork: blocks the right-click menu and dragging on
// anything inside a [data-protect] container. It can't stop screenshots.
export default function ImageProtection() {
  useEffect(() => {
    const block = (e: Event) => {
      if (e.target instanceof Element && e.target.closest("[data-protect]")) e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, []);

  return null;
}
