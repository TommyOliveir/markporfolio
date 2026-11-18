// Textures painted on a canvas: shop signs in the site's own fonts, the plaza's welcome board, Mark's
// sandwich board, and the Philippine flag.

import { CanvasTexture, SRGBColorSpace } from "three";

function fonts() {
  const css = getComputedStyle(document.documentElement);
  return {
    display: css.getPropertyValue("--font-cormorant").trim() || "Georgia, serif",
    caps: css.getPropertyValue("--font-cinzel").trim() || "Georgia, serif",
    script: css.getPropertyValue("--font-cedarville").trim() || "cursive",
  };
}

/** Waits for the site's fonts so the canvases don't paint in the fallback face. */
export async function loadFonts() {
  const f = fonts();
  await Promise.allSettled([
    document.fonts.load(`600 40px ${f.caps}`),
    document.fonts.load(`italic 600 40px ${f.display}`),
    document.fonts.load(`40px ${f.script}`),
  ]);
}

function texture(canvas: HTMLCanvasElement) {
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Shops that keep their own colours instead of one from the rotation. */
const BRAND_COLOURS: Record<string, [string, string]> = {
  Jollibee: ["#d3121f", "#ffd400"],
};

const SIGN_COLOURS = [
  ["#1a2b52", "#f4d78f"],
  ["#b92a4f", "#fdfaf3"],
  ["#1b8e8e", "#fdfaf3"],
  ["#f2a516", "#1d1b2a"],
  ["#fdfaf3", "#b92a4f"],
  ["#2f6b2a", "#fdfaf3"],
];

/** A painted shop sign: the name in engraved caps on a coloured board. Returns the texture and its width/height ratio. */
export function signTexture(text: string, index: number) {
  const f = fonts();
  const [bg, fg] = BRAND_COLOURS[text] ?? SIGN_COLOURS[index % SIGN_COLOURS.length];
  const label = text.toUpperCase();
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `600 64px ${f.caps}`;
  measure.letterSpacing = "6px";
  const w = Math.min(Math.ceil(measure.measureText(label).width) + 90, 1800);
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.globalAlpha = 1;
  ctx.fillStyle = fg;
  ctx.font = `600 64px ${f.caps}`;
  ctx.letterSpacing = "6px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, w / 2, h / 2 + 4, w - 60);
  return { texture: texture(canvas), aspect: w / h };
}

/** The plaza's welcome board. */
export function welcomeTexture() {
  const f = fonts();
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fdfaf3";
  ctx.fillRect(0, 0, 1024, 360);
  ctx.strokeStyle = "#b92a4f";
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, 988, 324);
  ctx.fillStyle = "#1d1b2a";
  ctx.textAlign = "center";
  ctx.font = `600 34px ${f.caps}`;
  ctx.letterSpacing = "10px";
  ctx.fillText("WELCOME TO", 512, 100);
  ctx.font = `600 128px ${f.caps}`;
  ctx.letterSpacing = "16px";
  ctx.fillText("MOLO PLAZA", 512, 225);
  ctx.font = `italic 600 40px ${f.display}`;
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#4a4657";
  ctx.fillText("Iloilo City", 512, 300);
  return texture(canvas);
}

/** Mark's sandwich board at the foot of the stairs. */
export function boardTexture() {
  const f = fonts();
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 720;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#24302b";
  ctx.fillRect(0, 0, 512, 720);
  ctx.strokeStyle = "#c79a5a";
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, 490, 698);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f4d78f";
  ctx.font = `600 44px ${f.caps}`;
  ctx.letterSpacing = "8px";
  ctx.fillText("POSTCARDS", 256, 130);
  ctx.fillStyle = "#fdfaf3";
  ctx.font = `76px ${f.script}`;
  ctx.letterSpacing = "0px";
  ctx.fillText("by Mark", 256, 245);
  ctx.font = `italic 600 42px ${f.display}`;
  ctx.fillStyle = "#e9e2d3";
  ctx.fillText("ink & watercolour", 256, 330);
  ctx.fillText("of Iloilo", 256, 380);
  // a little hand-drawn arrow pointing up the stairs
  ctx.strokeStyle = "#f2a516";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(256, 640);
  ctx.quadraticCurveTo(236, 560, 256, 470);
  ctx.moveTo(214, 515);
  ctx.lineTo(256, 465);
  ctx.lineTo(300, 512);
  ctx.stroke();
  ctx.fillStyle = "#f4d78f";
  ctx.font = `600 28px ${f.caps}`;
  ctx.letterSpacing = "6px";
  ctx.fillText("UP THE STAIRS", 256, 690);
  return texture(canvas);
}

/** The Philippine flag: blue over red, a white triangle at the hoist with the golden sun and three stars. */
export function flagTexture() {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0038a8";
  ctx.fillRect(0, 0, w, h / 2);
  ctx.fillStyle = "#ce1126";
  ctx.fillRect(0, h / 2, w, h / 2);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(h * 0.866, h / 2);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  const gold = "#fcd116";
  ctx.fillStyle = gold;
  const sx = h * 0.29;
  const sy = h / 2;
  ctx.beginPath();
  ctx.arc(sx, sy, h * 0.075, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(h * 0.09, -h * 0.018);
    ctx.lineTo(h * 0.17, 0);
    ctx.lineTo(h * 0.09, h * 0.018);
    ctx.fill();
    ctx.restore();
  }
  const star = (x: number, y: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.4 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.fill();
  };
  star(h * 0.09, h * 0.11, h * 0.04);
  star(h * 0.09, h * 0.89, h * 0.04);
  star(h * 0.72, h / 2, h * 0.04);
  return texture(canvas);
}
