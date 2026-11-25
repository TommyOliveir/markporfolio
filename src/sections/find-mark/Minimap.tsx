"use client";

// A little round map in the corner, turning with the camera so "up" is the way you're looking: the
// streets, buildings and lawns of Molo, you (the arrow), Mark (the star), and the trail if it's on.

import { useEffect, useRef } from "react";
import type { Game } from "./game";
import { areas, buildings, churchFootprint, mansionFootprint, paths, roads } from "./molo-map";
import { BALLOON, LOST_POSTCARDS, MARK } from "./world";

const SIZE = 156; // css pixels
const SCALE = 1.25; // pixels per metre
const EXTENT = 220; // metres drawn either side of the plaza

function drawBase(dpr: number) {
  const px = Math.ceil(EXTENT * 2 * SCALE * dpr);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE * dpr, SCALE * dpr);
  ctx.translate(EXTENT, EXTENT);
  ctx.fillStyle = "#efe6d3";
  ctx.fillRect(-EXTENT, -EXTENT, EXTENT * 2, EXTENT * 2);
  const poly = (pts: number[], fill: string, stroke?: string) => {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  };
  const colours: Record<string, string> = {
    plaza: "#f6efe0",
    churchyard: "#f3ecdf",
    paving: "#e6c7a8",
    grass: "#b9d39a",
    grove: "#a6c88a",
    garden: "#b2d293",
    "mansion-grounds": "#c4dba8",
    playground: "#ecd9b0",
    parking: "#dedbd3",
  };
  for (const a of areas) if (colours[a.kind]) poly(a.points, colours[a.kind]);
  ctx.lineCap = ctx.lineJoin = "round";
  for (const r of roads) {
    ctx.beginPath();
    for (let i = 0; i < r.points.length; i += 2) ctx.lineTo(r.points[i], r.points[i + 1]);
    ctx.strokeStyle = r.kind === "service" ? "#d9d3c7" : "#fdfaf3";
    ctx.lineWidth = r.width;
    ctx.stroke();
  }
  for (const p of paths) {
    ctx.beginPath();
    for (let i = 0; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.strokeStyle = "#e9dcc4";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  for (const b of buildings) poly(b.points, "#d8cbb4", "#c4b597");
  poly(churchFootprint, "#d98a8f", "#b92a4f");
  poly(mansionFootprint, "#f0c766", "#c8961f");
  return canvas;
}

export default function Minimap({ game }: { game: Game }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.height = SIZE * dpr;
    const ctx = canvas.getContext("2d")!;
    const base = drawBase(dpr);
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const t = now / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.save();
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(SIZE / 2, SIZE / 2);
      ctx.rotate(game.yaw - Math.PI); // the way you're looking points up
      ctx.scale(SCALE, SCALE);
      ctx.translate(-game.x, -game.z);
      ctx.drawImage(base, -EXTENT, -EXTENT, EXTENT * 2, EXTENT * 2);

      if (game.guiding && game.trail) {
        ctx.beginPath();
        for (const [x, z] of game.trail) ctx.lineTo(x, z);
        ctx.strokeStyle = "#f2a516";
        ctx.lineWidth = 2.4;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // the lost postcards still to find: little cream cards with a gold edge (pulsing big for a few
      // seconds after the quest's story card, to show where they are)
      const since = (now - game.questHint) / 1000;
      const grow = game.questHint && since < 4 ? 1.9 + Math.sin(since * 9) * 0.35 : 1;
      for (const p of LOST_POSTCARDS) {
        if (!game.questStarted || game.collected.has(p.id)) continue;
        ctx.save();
        ctx.translate(p.x, p.z);
        ctx.rotate(-(game.yaw - Math.PI));
        ctx.fillStyle = "#fdfaf3";
        ctx.strokeStyle = "#e6ab2e";
        ctx.lineWidth = 1.4;
        ctx.scale(grow, grow);
        ctx.fillRect(-3.5, -2.5, 7, 5);
        ctx.strokeRect(-3.5, -2.5, 7, 5);
        ctx.restore();
      }

      // the pancit stall, while Mark's waiting for his bowl: a steaming bowl (pulsing big for a few
      // seconds after he asks)
      if (game.errand === "fetch") {
        const since = (now - game.errandHint) / 1000;
        const grow = since < 4 ? 1.9 + Math.sin(since * 9) * 0.35 : 1;
        ctx.save();
        ctx.translate(game.pancit.x, game.pancit.z);
        ctx.rotate(-(game.yaw - Math.PI));
        ctx.scale(grow, grow);
        ctx.beginPath();
        ctx.arc(0, 0, 3.6, 0, Math.PI);
        ctx.closePath();
        ctx.fillStyle = "#fdfaf3";
        ctx.fill();
        ctx.strokeStyle = "#e6ab2e";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.beginPath();
        for (const x of [-1.4, 1.4]) {
          ctx.moveTo(x, -1);
          ctx.quadraticCurveTo(x + 1, -2.6, x, -4.2);
        }
        ctx.strokeStyle = "#e6ab2e";
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.restore();
      }

      // the hot-air balloon: at its lawn, or wherever it is up in the sky
      ctx.save();
      ctx.translate(game.flying ? game.x : BALLOON.x, game.flying ? game.z : BALLOON.z);
      ctx.rotate(-(game.yaw - Math.PI));
      ctx.beginPath();
      ctx.arc(0, -2.5, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = "#f2a516";
      ctx.fill();
      ctx.strokeStyle = "#fdfaf3";
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.fillStyle = "#8a5f31";
      ctx.fillRect(-1.6, 2.6, 3.2, 2.4);
      ctx.restore();

      // Mark: a pulsing star
      const pulse = 1 + Math.sin(t * 4) * 0.15;
      ctx.save();
      ctx.translate(MARK.x, MARK.z);
      ctx.rotate(-(game.yaw - Math.PI));
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = (i % 2 ? 3 : 7) * pulse;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = "#d63c62";
      ctx.fill();
      ctx.strokeStyle = "#fdfaf3";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // you: an arrow
      ctx.save();
      ctx.translate(game.x, game.z);
      ctx.rotate(-game.heading + Math.PI);
      ctx.beginPath();
      ctx.moveTo(0, -5.5);
      ctx.lineTo(4, 4.5);
      ctx.lineTo(0, 2.4);
      ctx.lineTo(-4, 4.5);
      ctx.closePath();
      ctx.fillStyle = "#1a2b52";
      ctx.fill();
      ctx.strokeStyle = "#fdfaf3";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
      ctx.restore();

      // north, on the rim
      const north = game.yaw - Math.PI - Math.PI / 2;
      const nx = SIZE / 2 + Math.cos(north) * (SIZE / 2 - 11);
      const ny = SIZE / 2 + Math.sin(north) * (SIZE / 2 - 11);
      ctx.fillStyle = "#1d1b2a";
      ctx.beginPath();
      ctx.arc(nx, ny, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fdfaf3";
      ctx.font = "600 10px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("N", nx, ny + 0.5);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="size-[7.5rem] rounded-full border-2 border-card bg-paper shadow-lg sm:size-[9.75rem]"
    />
  );
}
