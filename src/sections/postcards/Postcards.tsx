"use client";

import { postcards, type Postcard } from "./content";
import FlipCard from "./FlipCard";
import WhereToBuy from "./WhereToBuy";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import Watercolor from "@/components/ui/Watercolor";
import { sections } from "@/sections/sections";

const tilts = [-1.5, 1, -0.5, 1.5, -1, 0.5];

// Placeholder cards (draft) stay in the data until a real scan replaces them.
const shown = postcards.filter((c) => !c.draft);
const few = shown.length < 3;

export default function Postcards() {
  return (
    <section
      id={sections.postcards.id}
      data-protect
      className="relative overflow-hidden bg-paper-deep/60 px-4 pt-28 pb-28 sm:px-6"
    >
      <Watercolor
        seed={21}
        blooms={[
          { x: 92, y: 8, r: 18, color: "#d63c62", opacity: 0.1 },
          { x: 6, y: 42, r: 16, color: "#2c56b8", opacity: 0.14 },
          { x: 85, y: 70, r: 14, color: "#f2a516", opacity: 0.16 },
        ]}
      />

      <SectionHeading numeral="III" kicker="Postcards" title="Little letters from elsewhere">
        Favourite pieces, printed on heavy card. Turn one over to read the back.
      </SectionHeading>

      {/* With a full set, a grid (grid-flow-dense lets landscape cards fill in beside a tall portrait one);
          with only one or two, a centred row so a lone card doesn't sit in the corner of an empty grid. */}
      <div
        className={
          few
            ? "relative mx-auto flex max-w-6xl flex-wrap justify-center gap-x-10 gap-y-16"
            : "relative mx-auto grid max-w-6xl grid-flow-dense gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {shown.map((card, i) => (
          <Reveal
            key={card.slug}
            delay={(i % 3) * 0.1}
            className={few ? "w-full max-w-sm" : isPortrait(card) ? "sm:row-span-2" : undefined}
          >
            <FlipCard card={card} tilt={tilts[i % tilts.length]} />
          </Reveal>
        ))}
      </div>

      <WhereToBuy />
    </section>
  );
}

const isPortrait = (card: Postcard) => !!card.size && card.size.height > card.size.width;
