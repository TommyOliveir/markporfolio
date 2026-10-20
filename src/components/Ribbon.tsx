import { CompassStar } from "./Ornaments";

const words = [
  "Original drawings",
  "Watercolour & acrylic prints",
  "Postcards",
  "Commissions open",
  "Cities",
  "Nature",
  "Seas",
  "Reveries",
];

// A slow engraved band between the hero and the gallery.
export default function Ribbon() {
  const row = [...words, ...words];
  return (
    <div className="relative border-y border-ink/15 py-1">
      <div className="overflow-hidden border-y border-ink/15 py-4">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap" aria-hidden>
          {[...row, ...row].map((w, i) => (
            <span key={i} className="font-display flex items-center gap-10 text-2xl text-ink-soft italic sm:text-3xl">
              {w}
              <CompassStar points={4} className="size-3.5 text-rose" />
            </span>
          ))}
        </div>
      </div>
      <p className="sr-only">{words.join(", ")}</p>
    </div>
  );
}
