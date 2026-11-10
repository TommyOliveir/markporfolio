// Site-wide settings: the artist's name and details, contact info and the site's address.
// Each section's own content (paintings, textiles, postcards, collectors) lives in its folder
// under src/sections/<section>/content.ts.

// Public address of the site. Set NEXT_PUBLIC_SITE_URL in Vercel once the real domain is connected.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://markporfolio.vercel.app").replace(/\/$/, ""); // TODO: confirm domain

export const site = {
  artist: "Mark",
  fullName: "Mark Anthony Larida", // TODO: replace with the artist's real name
  tagline: "Ink, watercolour, acrylic & oil — real places, set adrift in colour.",
  intro:
    "Every piece begins with a fine-line drawing, stroke by stroke, until a whole city emerges on the page. Then I let the colour take over — loose, vibrant and free-flowing, spilling beyond the lines like a dream that refuses to stay put.",

  // Commissions: shown big in the contact section. Use digits only in `phoneRaw`.
  phoneDisplay: "+63 969 033 6049", // TODO: replace with the real cell number
  phoneRaw: "+63 969 033 6049",
  messenger: "https://m.me/markanthony.larida.3", // Messenger chat with Mark's Facebook profile; "" hides the button
  facebook: "https://www.facebook.com/markanthony.larida.3/",
  // "Email me" button in the contact card; "" hides it.
  contactEmail: "marklarida9999@gmail.com",

  about: [
    "As an **Ilonggo artist, I have developed a style that is distinctly my own**, blending architectural precision with playful surrealism and a vivid imagination. I draw real places — cathedrals, canal houses and rooftops glimpsed from a café table — and transform them into extraordinary worlds where reality and fantasy meet. Islands float away on balloons, fish swim through the sky, and ships sail beyond the edge of the map. My work is an invitation to see familiar places differently, where the ordinary becomes unexpected and imagination knows no boundaries.",
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
