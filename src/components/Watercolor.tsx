import { useId } from "react";
import { blobPath, seeded } from "@/lib/seeded";

export type Bloom = {
  /** centre, as a percentage of the box */
  x: number;
  y: number;
  /** radius, as a percentage of the box width */
  r: number;
  color: string;
  opacity?: number;
};

// Loose watercolour pools: displaced, softly blurred blobs with a darker drying edge.
export default function Watercolor({
  blooms,
  seed = 1,
  blend = "multiply",
  softness = 14,
  className = "",
}: {
  blooms: Bloom[];
  seed?: number;
  blend?: "multiply" | "screen" | "normal";
  /** blur radius of the pigment edge; raise it for a wetter, hazier wash */
  softness?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const rand = seeded(seed);
  const W = 1000;
  const H = 1000;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
      style={{ mixBlendMode: blend }}
    >
      <defs>
        <filter id={`wc-${id}`} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={4} seed={seed} result="t" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="t"
            scale={70}
            xChannelSelector="R"
            yChannelSelector="G"
            result="d"
          />
          <feGaussianBlur in="d" stdDeviation={softness} result="b" />
          <feMorphology in="b" operator="erode" radius={4} result="e" />
          <feComposite in="b" in2="e" operator="out" result="rim" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="rim" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#wc-${id})`}>
        {blooms.map((b, i) => {
          const r = (b.r / 100) * W;
          return (
            <path
              key={i}
              d={blobPath(rand, (b.x / 100) * W, (b.y / 100) * H, r, r * rand.range(0.7, 1), 0.32)}
              fill={b.color}
              opacity={b.opacity ?? 0.5}
            />
          );
        })}
      </g>
    </svg>
  );
}
