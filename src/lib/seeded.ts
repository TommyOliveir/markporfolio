// Deterministic randomness so server and client render identical "hand-drawn" shapes.

export function seeded(seed: number) {
  let s = seed | 0;
  const next = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a: number, b: number) => a + next() * (b - a),
    pick: <T,>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)],
  };
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** A smooth, slightly irregular closed blob — the footprint of a watercolour pool. */
export function blobPath(rand: ReturnType<typeof seeded>, cx: number, cy: number, rx: number, ry: number, jitter = 0.28, points = 11) {
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const k = 1 + rand.range(-jitter, jitter);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const mid = (a: [number, number], b: [number, number]) => `${r1((a[0] + b[0]) / 2)} ${r1((a[1] + b[1]) / 2)}`;
  let d = `M${mid(pts[pts.length - 1], pts[0])}`;
  pts.forEach((p, i) => {
    d += `Q${r1(p[0])} ${r1(p[1])} ${mid(p, pts[(i + 1) % pts.length])}`;
  });
  return d + "Z";
}
