"use client";

import { motion } from "motion/react";
import { seeded } from "@/lib/seeded";

// A fantasy old-town skyline — canal gables, domes, a cathedral — drawn stroke by
// stroke on load, then washed with colour, the way Mark builds a piece.

const W = 1600;
const H = 540;
const B = 522; // ground line

type Building = { outline: string; ink: string; darks: string; lits: string; washes: { d: string; color: string }[] };

const P = {
  rose: "#d63c62",
  teal: "#1b8e8e",
  saffron: "#f2a516",
  ultra: "#2c56b8",
  violet: "#6b4aa6",
  brick: "#b5432f",
  sap: "#5aa43a",
  cream: "#e9d9b4",
  sky: "#5aa9d6",
};

function build(): Building[] {
  const rand = seeded(2026);
  const j = () => rand.range(-0.8, 0.8); // pen wobble
  const r = (v: number) => Math.round(v * 10) / 10;
  const L = (x1: number, y1: number, x2: number, y2: number) => `M${r(x1 + j())} ${r(y1 + j())}L${r(x2 + j())} ${r(y2 + j())}`;
  const rect = (x: number, y: number, w: number, h: number) => `M${r(x)} ${r(y)}h${r(w)}v${r(h)}h${r(-w)}Z`;
  const arch = (x: number, y: number, w: number, h: number) =>
    `M${r(x)} ${r(y)}V${r(y - h + w / 2)}A${r(w / 2)} ${r(w / 2)} 0 0 1 ${r(x + w)} ${r(y - h + w / 2)}V${r(y)}Z`;
  const lancet = (x: number, y: number, w: number, h: number) =>
    `M${r(x)} ${r(y)}V${r(y - h + w * 0.6)}Q${r(x)} ${r(y - h)} ${r(x + w / 2)} ${r(y - h)}Q${r(x + w)} ${r(y - h)} ${r(x + w)} ${r(y - h + w * 0.6)}V${r(y)}Z`;
  const circle = (cx: number, cy: number, rad: number) =>
    `M${r(cx - rad)} ${r(cy)}a${r(rad)} ${r(rad)} 0 1 0 ${r(rad * 2)} 0a${r(rad)} ${r(rad)} 0 1 0 ${r(-rad * 2)} 0Z`;

  const out: Building[] = [];

  function house(x: number, w: number, h: number, type: "step" | "neck" | "bell" | "gable", color: string) {
    const top = B - h;
    const gh = w * rand.range(0.45, 0.62);
    const peak = top - gh;
    let g = "";
    if (type === "step") {
      const s = 4, dx = (w * 0.38) / s, dy = gh / s;
      let cx = x, cy = top;
      for (let i = 0; i < s; i++) { cy -= dy; g += `L${r(cx)} ${r(cy)}`; cx += dx; g += `L${r(cx)} ${r(cy)}`; }
      cx = x + w * 0.62;
      g += `L${r(cx)} ${r(cy)}`;
      for (let i = 0; i < s; i++) { cy += dy; g += `L${r(cx)} ${r(cy)}`; cx += dx; g += `L${r(cx)} ${r(cy)}`; }
    } else if (type === "neck") {
      g = `Q${r(x + w * 0.3)} ${r(top)} ${r(x + w * 0.3)} ${r(top - gh * 0.6)}L${r(x + w * 0.3)} ${r(peak)}L${r(x + w / 2)} ${r(peak - 12)}L${r(x + w * 0.7)} ${r(peak)}L${r(x + w * 0.7)} ${r(top - gh * 0.6)}Q${r(x + w * 0.7)} ${r(top)} ${r(x + w)} ${r(top)}`;
    } else if (type === "bell") {
      g = `C${r(x)} ${r(top - gh * 0.5)} ${r(x + w * 0.28)} ${r(top - gh * 0.35)} ${r(x + w * 0.28)} ${r(top - gh * 0.8)}Q${r(x + w / 2)} ${r(peak - 16)} ${r(x + w * 0.72)} ${r(top - gh * 0.8)}C${r(x + w * 0.72)} ${r(top - gh * 0.35)} ${r(x + w)} ${r(top - gh * 0.5)} ${r(x + w)} ${r(top)}`;
    } else {
      g = `L${r(x + w / 2)} ${r(peak)}L${r(x + w)} ${r(top)}`;
    }
    const outline = `M${r(x)} ${B}L${r(x)} ${r(top)}${g}L${r(x + w)} ${B}Z`;
    let ink = outline, darks = "", lits = "";
    const floors = Math.max(2, Math.round(h / 56));
    const fh = (h - 10) / floors;
    const cols = w > 86 ? 3 : 2;
    const ww = w / (cols * 1.9);
    const gap = (w - cols * ww) / (cols + 1);
    for (let f = 0; f < floors - 1; f++) {
      const wy = top + 10 + f * fh;
      for (let c = 0; c < cols; c++) {
        const wx = x + gap + c * (ww + gap);
        const win = rect(wx, wy, ww, fh * 0.6);
        if (rand.next() < 0.3) lits += win; else darks += win;
        ink += win + L(wx - 2, wy + fh * 0.6 + 2, wx + ww + 2, wy + fh * 0.6 + 2);
      }
    }
    const dw = w * 0.24, dh = fh * 0.8;
    const dx = x + (rand.next() < 0.5 ? gap : w - gap - dw);
    darks += arch(dx, B, dw, dh);
    ink += arch(dx, B, dw, dh);
    const gw = ww * 0.8, gwin = rect(x + w / 2 - gw / 2, top - gh * 0.6, gw, gh * 0.38);
    if (rand.next() < 0.5) lits += gwin; else darks += gwin;
    ink += gwin;
    for (let i = 0; i < w / 9; i++) {
      const bx = x + rand.range(4, w - 14), by = top + rand.range(6, h - 10);
      ink += L(bx, by, bx + rand.range(5, 9), by);
    }
    out.push({ outline, ink, darks, lits, washes: [{ d: outline, color }] });
  }

  function domeTower(x: number, w: number, h: number, color: string) {
    const bodyTop = B - h * 0.56;
    const dw = w * 0.72, dx = x + (w - dw) / 2, drumTop = bodyTop - h * 0.12;
    const domeTop = drumTop - h * 0.22;
    const dome = `M${r(dx - 4)} ${r(drumTop)}C${r(dx - 4)} ${r(domeTop + 10)} ${r(x + w / 2 - 6)} ${r(domeTop)} ${r(x + w / 2)} ${r(domeTop)}C${r(x + w / 2 + 6)} ${r(domeTop)} ${r(dx + dw + 4)} ${r(domeTop + 10)} ${r(dx + dw + 4)} ${r(drumTop)}Z`;
    const lw = w * 0.14, lantern = rect(x + w / 2 - lw / 2, domeTop - h * 0.07, lw, h * 0.07);
    const outline = rect(x, bodyTop, w, B - bodyTop) + rect(dx, drumTop, dw, bodyTop - drumTop) + dome + lantern;
    let ink = outline + L(x + w / 2, domeTop - h * 0.07, x + w / 2, B - h) + L(x + w / 2 - 6, B - h + 8, x + w / 2 + 6, B - h + 8);
    let darks = "";
    const lits = "";
    for (let k = 1; k < 4; k++) ink += `M${r(dx + (dw * k) / 4)} ${r(drumTop)}Q${r(x + w / 2 + ((k - 2) * dw) / 6)} ${r(domeTop + 6)} ${r(x + w / 2)} ${r(domeTop)}`;
    for (let k = 0; k < 3; k++) { const a = arch(dx + dw * 0.12 + k * dw * 0.3, bodyTop - 6, dw * 0.16, (bodyTop - drumTop) * 0.7); darks += a; ink += a; }
    const levels = 3, lh = (B - bodyTop) / levels;
    for (let l = 0; l < levels; l++) {
      const ly = bodyTop + l * lh;
      ink += L(x, ly + 4, x + w, ly + 4);
      for (let c = 0; c < 2; c++) {
        const aw = w * 0.18, ax = x + w * 0.22 + c * w * 0.38;
        const a = arch(ax, ly + lh - 8, aw, lh * 0.62);
        darks += a; ink += a;
      }
    }
    out.push({ outline, ink, darks, lits, washes: [{ d: rect(x, bodyTop, w, B - bodyTop) + rect(dx, drumTop, dw, bodyTop - drumTop), color }, { d: dome, color: P.teal }] });
  }

  function spireTower(x: number, w: number, h: number, color: string, clock = false, spireColor = P.ultra) {
    const bodyTop = B - h * 0.66;
    const bw = w * 0.8, bx = x + (w - bw) / 2, belTop = bodyTop - h * 0.09;
    const spire = `M${r(bx - 3)} ${r(belTop)}L${r(x + w / 2)} ${r(B - h)}L${r(bx + bw + 3)} ${r(belTop)}Z`;
    const outline = rect(x, bodyTop, w, B - bodyTop) + rect(bx, belTop, bw, bodyTop - belTop) + spire;
    let ink = outline + L(x + w / 2, B - h, x + w / 2, B - h - 16) + L(x + w / 2 - 6, B - h - 10, x + w / 2 + 6, B - h - 10);
    let darks = "", lits = "";
    for (let c = 0; c < 2; c++) { const a = arch(bx + bw * 0.16 + c * bw * 0.44, bodyTop - 4, bw * 0.24, (bodyTop - belTop) * 0.72); darks += a; ink += a; }
    const levels = 4, lh = (B - bodyTop) / levels;
    for (let l = 0; l < levels; l++) {
      const ly = bodyTop + l * lh;
      ink += L(x, ly + 3, x + w, ly + 3);
      if (l === 0 && clock) {
        const cr = w * 0.24, cy = ly + lh / 2 + 3;
        lits += circle(x + w / 2, cy, cr);
        ink += circle(x + w / 2, cy, cr) + L(x + w / 2, cy, x + w / 2, cy - cr * 0.7) + L(x + w / 2, cy, x + w / 2 + cr * 0.5, cy + 2);
      } else if (l === levels - 1) {
        const pw = w * 0.42, d = lancet(x + (w - pw) / 2, B, pw, lh * 0.82);
        darks += d; ink += d + lancet(x + (w - pw) / 2 - 5, B, pw + 10, lh * 0.82 + 6);
      } else {
        for (let c = 0; c < 2; c++) {
          const lw = w * 0.17, d = lancet(x + w * 0.22 + c * w * 0.39, ly + lh - 8, lw, lh * 0.62);
          if (rand.next() < 0.25) lits += d; else darks += d;
          ink += d;
        }
      }
    }
    for (let i = 0; i < 14; i++) { const sx = x + rand.range(3, w - 12), sy = bodyTop + rand.range(8, B - bodyTop - 8); ink += L(sx, sy, sx + rand.range(5, 9), sy); }
    out.push({ outline, ink, darks, lits, washes: [{ d: rect(x, bodyTop, w, B - bodyTop) + rect(bx, belTop, bw, bodyTop - belTop), color }, { d: spire, color: spireColor }] });
  }

  function cathedral(x0: number, w: number, h: number) {
    const tw = w * 0.27;
    const nx = x0 + tw, nw = w - tw * 2, cx = x0 + w / 2;
    const naveTop = B - h * 0.55, peak = B - h * 0.7;
    const outline = `M${r(nx)} ${B}V${r(naveTop)}L${r(cx)} ${r(peak)}L${r(nx + nw)} ${r(naveTop)}V${B}Z`;
    let ink = outline + L(cx, peak, cx, peak - 16) + L(cx - 6, peak - 10, cx + 6, peak - 10);
    let darks = "";
    let lits = "";
    const rr = nw * 0.28, ry = B - h * 0.38;
    lits += circle(cx, ry, rr * 0.35);
    ink += circle(cx, ry, rr) + circle(cx, ry, rr * 0.86) + circle(cx, ry, rr * 0.35);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      ink += L(cx + Math.cos(a) * rr * 0.35, ry + Math.sin(a) * rr * 0.35, cx + Math.cos(a) * rr * 0.86, ry + Math.sin(a) * rr * 0.86);
    }
    const gy = B - h * 0.2, n = 7, gw = nw / n;
    ink += L(nx, gy, nx + nw, gy) + L(nx, gy - h * 0.07, nx + nw, gy - h * 0.07);
    for (let i = 0; i < n; i++) { const a = arch(nx + i * gw + gw * 0.22, gy - 3, gw * 0.56, h * 0.055); darks += a; ink += a; }
    const pw = nw * 0.34, px = cx - pw / 2;
    darks += lancet(px, B, pw, h * 0.15);
    for (let k = 0; k < 3; k++) ink += lancet(px - k * 5, B, pw + k * 10, h * 0.15 + k * 6);
    for (let i = 0; i < 20; i++) { const sx = nx + rand.range(4, nw - 12), sy = naveTop + rand.range(6, B - naveTop - 8); ink += L(sx, sy, sx + rand.range(5, 9), sy); }
    out.push({ outline, ink, darks, lits, washes: [{ d: outline, color: P.cream }, { d: circle(cx, ry, rr * 0.86), color: P.rose }] });
    spireTower(x0, tw, h, P.cream, true, P.teal);
    spireTower(x0 + w - tw, tw, h * 0.97, P.cream, false, P.teal);
  }

  house(-10, 92, 205, "step", P.rose);
  house(82, 96, 250, "neck", P.teal);
  house(178, 78, 185, "bell", P.saffron);
  house(256, 92, 228, "gable", P.ultra);
  domeTower(348, 108, 340, P.cream);
  house(456, 84, 206, "step", P.brick);
  cathedral(540, 300, 470);
  house(840, 86, 236, "bell", P.violet);
  house(926, 76, 192, "step", P.saffron);
  spireTower(1002, 72, 400, P.cream, true);
  house(1074, 96, 254, "neck", P.rose);
  house(1170, 80, 206, "gable", P.sap);
  house(1250, 92, 240, "step", P.teal);
  domeTower(1342, 92, 290, P.cream);
  house(1434, 86, 216, "bell", P.brick);
  house(1520, 96, 196, "neck", P.ultra);
  return out;
}

const buildings = build();
// Draw from the centre outwards, like sketching the landmark first.
const order = buildings
  .map((b, i) => ({ b, i, dist: Math.abs(i - buildings.length / 2) }))
  .sort((a, b) => a.dist - b.dist)
  .map((o, rank) => ({ ...o, rank }));

export default function InkSkyline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <defs>
        <filter id="sky-wash" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={3} seed={4} result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale={14} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={1.2} result="b" />
          <feMorphology in="b" operator="erode" radius={2} result="e" />
          <feComposite in="b" in2="e" operator="out" result="rim" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="rim" />
          </feMerge>
        </filter>
      </defs>

      {/* paper silhouettes */}
      <g fill="#f5efe3">
        {buildings.map((b, i) => (
          <path key={i} d={b.outline} />
        ))}
        <rect x={-10} y={B} width={W + 20} height={H - B + 10} />
      </g>

      {/* watercolour, laid in after the ink */}
      {order.map(({ b, i, rank }) =>
        b.washes.map((w, k) => (
          <motion.path
            key={`${i}-${k}`}
            d={w.d}
            fill={w.color}
            filter="url(#sky-wash)"
            style={{ mixBlendMode: "multiply" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            transition={{ duration: 1.4, delay: 1.6 + rank * 0.09 }}
          />
        )),
      )}

      {/* window glass */}
      {order.map(({ b, i, rank }) => (
        <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 1.2 + rank * 0.07 }}>
          <path d={b.darks} fill="#1d1b2a" />
          <path d={b.lits} fill="#f4c24f" />
        </motion.g>
      ))}

      {/* the pen */}
      <g fill="none" stroke="#1d1b2a" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        {order.map(({ b, i, rank }) => (
          <motion.path
            key={i}
            d={b.ink}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.2, ease: [0.45, 0, 0.25, 1], delay: 0.15 + rank * 0.06 }}
          />
        ))}
        <motion.path
          d={`M0 ${B}H${W}`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
      </g>
    </svg>
  );
}
