// Content for the Textiles section.

// Textile prints: hand-painted repeat patterns designed for fabric. Images live in /public/art/textiles.
export type Textile = {
  slug: string;
  title: string;
  src: string;
  width: number;
  height: number;
  motifs: string[]; // what's in the pattern, shown under the title
};

export const textiles: Textile[] = [
  {
    slug: "lotus-and-egrets",
    title: "Lotus & Egrets",
    src: "/art/textiles/lotus-and-egrets.jpg",
    width: 1138,
    height: 2048,
    motifs: ["Lotus", "Koi", "Egret", "Frog"],
  },
  {
    slug: "koi-pond",
    title: "Koi Pond",
    src: "/art/textiles/koi-pond.jpg",
    width: 1138,
    height: 2048,
    motifs: ["Koi", "Lotus", "Ripples"],
  },
  {
    slug: "hibiscus-and-songbirds",
    title: "Hibiscus & Songbirds",
    src: "/art/textiles/hibiscus-and-songbirds.jpg",
    width: 1252,
    height: 2048,
    motifs: ["Hibiscus", "Jasmine", "Songbirds", "Dragonflies"],
  },
  {
    slug: "bamboo-and-egrets",
    title: "Bamboo & Egrets",
    src: "/art/textiles/bamboo-and-egrets.jpg",
    width: 1138,
    height: 2048,
    motifs: ["Bamboo", "Egret", "Kingfisher", "Hibiscus"],
  },
  {
    slug: "sunflowers-and-strawberries",
    title: "Sunflowers & Strawberries",
    src: "/art/textiles/sunflowers-and-strawberries.jpg",
    width: 1138,
    height: 2048,
    motifs: ["Sunflowers", "Poppies", "Strawberries", "Finches"],
  },
  {
    slug: "peonies-and-parakeets",
    title: "Peonies & Parakeets",
    src: "/art/textiles/peonies-and-parakeets.jpg",
    width: 1000,
    height: 1800,
    motifs: ["Peonies", "Tulips", "Parakeets"],
  },
  {
    slug: "deer-in-bloom",
    title: "Deer in Bloom",
    src: "/art/textiles/deer-in-bloom.jpg",
    width: 1138,
    height: 2048,
    motifs: ["Spotted deer", "Peonies", "Morning glory", "Blossom"],
  },
];
