// Small engraved ornaments shared across sections.

export function CompassStar({ className = "", points = 8 }: { className?: string; points?: 4 | 8 }) {
  const d: string[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2 - Math.PI / 2;
    const long = i % 2 === 0 || points === 4;
    const r = long ? 48 : 30;
    const w = long ? 9 : 6;
    const tip = [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
    const l = [50 + Math.cos(a - Math.PI / 2) * w, 50 + Math.sin(a - Math.PI / 2) * w];
    const rr = [50 + Math.cos(a + Math.PI / 2) * w, 50 + Math.sin(a + Math.PI / 2) * w];
    d.push(`M50 50L${l.join(" ")}L${tip.join(" ")}L${rr.join(" ")}Z`);
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {d.map((p, i) => (
        <path key={i} d={p} fill={i % 2 ? "none" : "currentColor"} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
      ))}
      <circle cx="50" cy="50" r="5" fill="currentColor" />
    </svg>
  );
}

/** A centred ink flourish used under headings. */
export function Flourish({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" aria-hidden>
      <path d="M4 12 H92" />
      <path d="M148 12 H236" />
      <path d="M92 12 C100 4 108 4 112 10 C115 15 108 18 105 13" />
      <path d="M148 12 C140 4 132 4 128 10 C125 15 132 18 135 13" />
      <path d="M120 3 L124 12 L120 21 L116 12 Z" fill="currentColor" />
    </svg>
  );
}

/** A hand-inked hot-air balloon: `a` is the envelope colour, `b` the stripes. */
export function Balloon({ a, b, className = "" }: { a: string; b: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 150" className={className} aria-hidden>
      <g stroke="#1d1b2a" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
        <path d="M10 50A40 40 0 0 1 90 50C90 74 64 90 60 100H40C36 90 10 74 10 50Z" fill={a} />
        <path d="M50 10Q30 40 36 70T40 100" fill={b} fillOpacity={0.9} />
        <path d="M50 10Q70 40 64 70T60 100" fill={b} fillOpacity={0.9} />
        <path d="M50 10Q20 30 22 60M50 10Q80 30 78 60" fill="none" />
        <path d="M14 66Q50 80 86 66" fill="none" />
        <path d="M40 100L42 118M60 100L58 118" fill="none" />
        <rect x={40} y={118} width={20} height={14} fill="#8a5a3c" />
        <path d="M40 124H60" fill="none" />
      </g>
    </svg>
  );
}
