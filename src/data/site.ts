// Everything you'll want to edit lives here: name, phone, shop locations, artworks.
// To add real artwork, drop a scan/photo into /public/art and point `src` at it
// (update width/height to the image's real pixel size so it isn't stretched).

// Public address of the site. Set NEXT_PUBLIC_SITE_URL in Vercel once the real domain is connected.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://markporfolio.vercel.app").replace(/\/$/, ""); // TODO: confirm domain

export const site = {
  artist: "Mark",
  fullName: "Mark Anthony Larida", // TODO: replace with the artist's real name
  tagline: "Acrylics, and Oils, Ink and Watercolors.",
  intro:
    "Every piece begins with a fine-line drawing, stroke by stroke, until a whole city emerges on the page. Then I let the colour take over — loose, vibrant and free-flowing, spilling beyond the lines like a dream that refuses to stay put.",

  // Commissions: shown big in the contact section. Use digits only in `phoneRaw`.
  phoneDisplay: "+63 969 033 6049", // TODO: replace with the real cell number
  phoneRaw: "+63 969 033 6049",
  messenger: "https://m.me/", // TODO: set to your Facebook Page username (e.g. https://m.me/yourpage), or "" to hide the button
  instagram: "https://instagram.com/", // TODO: set or remove

  about: [
    "As an **ILongo artist, I have developed a style that is distinctly my own**, blending architectural precision with playful surrealism and a vivid imagination. I draw real places — cathedrals, canal houses and rooftops glimpsed from a café table — and transform them into extraordinary worlds where reality and fantasy meet. Islands float away on balloons, fish swim through the sky, and ships sail beyond the edge of the map. My work is an invitation to see familiar places differently, where the ordinary becomes unexpected and imagination knows no boundaries.",
    "I create my original artworks using archival ink, followed by watercolour, acrylic or oil on heavyweight cotton paper or canvas. Selected pieces are also reproduced as postcards and small prints, allowing a little of my world to travel home with you.",
  ],
  materials: ["Fineliner", "Archival ink", "Watercolour", "Acrylic paint", "Oil paint", "Cotton paper"],

  // Photo of Mark shown in the About section.
  portrait: { src: "/art/mark.JPG", width: 1536, height: 2048 },

  // The sketching community Mark started, shown under the About section.
  sketchcrawl: {
    name: "Sketchcrawl Culture",
    image: { src: "/art/sketch.JPG", width: 1588, height: 1978 },
    caption: "Sketchcrawl sa Molo · 29 March 2026",
    text: [
      "I also started Sketchcrawl Culture — a community of artists, students and weekend doodlers who meet up to draw a place together, right there on location.",
      "Everyone brings their own sketchbook and materials, finds a corner of the street, and draws what's in front of them. At the end the sketchbooks come out side by side: the same place, seen a dozen different ways.",
    ],
  },
};

// Where people can buy postcards in person. We don't sell online.
export const postcardShops = [
  {
    name: "Molo Mansion",
    address: "Yusay-Consing Mansion, 2 Locsin St Iloilo City",
    hours: "Thursday- Sunday · 2pm – 6pm",
    image: "/molomansion.jpg",
    imageWidth: 407,
    imageHeight: 541,
    // Google "Embed a map" URL for the place, so the card shows the mansion photo.
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3920.4915450491894!2d122.54346149999999!3d10.696518300000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33aee5517bb3872f%3A0x81e214299567755c!2sMolo%20Mansion!5e0!3m2!1sen!2shu!4v1792591278769!5m2!1sen!2shu",
  },
];

export const categories = ["Cities", "Nature", "Seas", "Reveries"] as const;

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

// TODO: confirm titles, stories, medium and sizes with Mark.
export const paintings: Painting[] = [
  {
    slug: "the-teacup-sea",
    title: "The Teacup Sea",
    year: 2026,
    medium: "Ink & watercolour on paper",
    size: "A3",
    category: "Seas",
    src: "/art/paintings/1.jpg",
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
    src: "/art/paintings/2.jpg",
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
    src: "/art/paintings/3.jpg",
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
    src: "/art/paintings/4.jpg",
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
    src: "/art/paintings/5.jpg",
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
    src: "/art/paintings/6.jpg",
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
    src: "/art/paintings/7.jpg",
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
    src: "/art/paintings/8.JPG",
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
    src: "/art/paintings/9.JPG",
    width: 1536,
    height: 2048,
    story:
      "A candy-striped lighthouse on the rocks, a whale leaping to say hello, and sparrows watching from the flowers.",
  },
];

export type Postcard = {
  slug: string;
  title: string;
  src: string;
  note: string; // handwritten message on the back
  stampColor: string;
};

export const postcards: Postcard[] = [
  {
    slug: "greetings-from-paris",
    title: "Greetings from Paris",
    src: "/art/postcards/greetings-from-paris.svg",
    note: "Drew the tower from a café chair. The sky did the rest.",
    stampColor: "#d63c62",
  },
  {
    slug: "canal-nights",
    title: "Canal Nights",
    src: "/art/postcards/canal-nights.svg",
    note: "Every window lit, just for a moment. Wish you'd seen it.",
    stampColor: "#1a2b52",
  },
  {
    slug: "balloon-isles",
    title: "Balloon Isles",
    src: "/art/postcards/balloon-isles.svg",
    note: "Our island drifted east today. Waving from up here!",
    stampColor: "#1b8e8e",
  },
  {
    slug: "the-old-cathedral",
    title: "The Old Cathedral",
    src: "/art/postcards/the-old-cathedral.svg",
    note: "Counted every brick. Lost count twice. Worth it.",
    stampColor: "#6b4aa6",
  },
  {
    slug: "the-paper-fleet",
    title: "The Paper Fleet",
    src: "/art/postcards/the-paper-fleet.svg",
    note: "Met a fish who knows the way home. Following it.",
    stampColor: "#2c56b8",
  },
  {
    slug: "midnight-bloom",
    title: "Midnight Bloom",
    src: "/art/postcards/midnight-bloom.svg",
    note: "The garden only opens after dark. Bring a lantern.",
    stampColor: "#e6ab2e",
  },
];
