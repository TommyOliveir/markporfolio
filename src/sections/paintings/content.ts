// Content for the Paintings section.
// To add real artwork, drop a scan/photo into /public/art and point `src` at it
// (set width/height to the image's real pixel size so it isn't stretched).

import { site } from "@/data/site";

export const categories = ["Cities", "Nature", "Seas"] as const;

export type Painting = {
  slug: string;
  title: string;
  year: number;
  medium: string;
  size: string;
  category: (typeof categories)[number];
  src: string;
  width: number;
  height: number;
  story: string;
};

/** Image description for search engines and screen readers, e.g. "The Teacup Sea — ink & watercolour on paper by Mark, an Iloilo artist". */
export const paintingAlt = (p: Painting) =>
  `${p.title} — ${p.medium.toLowerCase()} by ${site.artist}, an Iloilo artist`;

// TODO: confirm titles, stories, medium and sizes with Mark.
export const paintings: Painting[] = [
  {
    slug: "the-teacup-sea",
    title: "The Teacup Sea",
    year: 2026,
    medium: "Ink & watercolour on paper",
    size: "A3",
    category: "Seas",
    src: "/art/paintings/the-teacup-sea.jpg",
    width: 1440,
    height: 1920,
    story: "Little ships, a pink fish the size of a whale, and a teapot lighthouse keeping watch over the waves.",
  },
  {
    slug: "the-flower-stag",
    title: "The Flower Stag",
    year: 2026,
    medium: "Ink & watercolour on paper",
    size: "A3",
    category: "Nature",
    src: "/art/paintings/the-flower-stag.jpg",
    width: 1536,
    height: 2048,
    story:
      "Deep in the garden, where the roses grow wild, the stag keeps very still and lets the flowers grow around him.",
  },
  {
    slug: "where-the-ice-cream-grows",
    title: "Where the Ice Cream Grows",
    year: 2026,
    medium: "Ink & watercolour on paper",
    size: "A3",
    category: "Nature",
    src: "/art/paintings/where-the-ice-cream-grows.jpg",
    width: 1536,
    height: 2048,
    story: "A summer sky where cones sprout gardens, herons drift by, and the clouds taste faintly of strawberry.",
  },
  {
    slug: "twilight-at-the-theatre",
    title: "Twilight at the Theatre",
    year: 2026,
    medium: "Ink & watercolour on paper",
    size: "A3",
    category: "Cities",
    src: "/art/paintings/twilight-at-the-theatre.jpg",
    width: 1920,
    height: 2560,
    story: "Lanterns in the trees, a bow beneath the streetlamp, and the last show of the night about to begin.",
  },
  {
    slug: "hopscotch-lane",
    title: "Hopscotch Lane",
    year: 2026,
    medium: "Ink & watercolour on paper",
    size: "A3",
    category: "Cities",
    src: "/art/paintings/hopscotch-lane.jpg",
    width: 1920,
    height: 1493,
    story:
      "On this street the cats carry umbrellas, the ice-cream cart never runs out, and everyone stops for hopscotch.",
  },
  {
    slug: "airships-over-the-old-town",
    title: "Airships over the Old Town",
    year: 2026,
    medium: "Ink & watercolour on paper",
    size: "A3",
    category: "Cities",
    src: "/art/paintings/airships-over-the-old-town.jpg",
    width: 1440,
    height: 1920,
    story: "Crooked rooftops, a golden moon, and airships humming low over the old town after dark.",
  },
  {
    slug: "the-jellyfish-garden",
    title: "The Jellyfish Garden",
    year: 2026,
    medium: "Ink & watercolour on paper",
    size: "A3",
    category: "Nature",
    src: "/art/paintings/the-jellyfish-garden.jpg",
    width: 1440,
    height: 1920,
    story: "Where the sea meets the jungle, jellyfish float between the blossoms and the herons don't mind at all.",
  },
  {
    slug: "the-lady-of-the-hibiscus",
    title: "The Lady of the Hibiscus",
    year: 2026,
    medium: "Ink & watercolour on paper",
    size: "A3",
    category: "Nature",
    src: "/art/paintings/the-lady-of-the-hibiscus.jpg",
    width: 1687,
    height: 2048,
    story: "She waits in a garden of hibiscus and birds, holding her red hat like a secret she's about to share.",
  },
  {
    slug: "the-lighthouse-and-the-whale",
    title: "The Lighthouse and the Whale",
    year: 2026,
    medium: "Ink & watercolour on paper",
    size: "A3",
    category: "Seas",
    src: "/art/paintings/the-lighthouse-and-the-whale.jpg",
    width: 1536,
    height: 2048,
    story:
      "A candy-striped lighthouse on the rocks, a whale leaping to say hello, and sparrows watching from the flowers.",
  },
];
