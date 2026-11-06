// Content for the Postcards section: the cards themselves and where to buy them.
// To add real artwork, drop a scan/photo into /public/art and point `src` at it
// (set width/height to the image's real pixel size so it isn't stretched).

export type Postcard = {
  slug: string;
  title: string;
  src: string;
  note: string; // handwritten message on the back
  stampColor: string;
  /** Pixel size of the image. Leave out for the usual landscape 3:2 card; a tall image becomes a portrait card. */
  size?: { width: number; height: number };
  /** Placeholder artwork, kept here but not shown on the site until a real scan replaces it. */
  draft?: boolean;
};

export const postcards: Postcard[] = [
  {
    slug: "iloilo-city",
    title: "Iloilo City",
    src: "/art/postcards/iloilo-city.jpg",
    note: "Greetings from the City of Love — every church, a bowl of pancit molo, and a bike ride home.",
    stampColor: "#d63c62",
    size: { width: 1138, height: 2048 },
  },
  {
    slug: "greetings-from-paris",
    title: "Greetings from Paris",
    src: "/art/postcards/greetings-from-paris.svg",
    draft: true, // TODO: replace with a scan of the real postcard
    note: "Drew the tower from a café chair. The sky did the rest.",
    stampColor: "#d63c62",
  },
  {
    slug: "canal-nights",
    title: "Canal Nights",
    src: "/art/postcards/canal-nights.svg",
    draft: true, // TODO: replace with a scan of the real postcard
    note: "Every window lit, just for a moment. Wish you'd seen it.",
    stampColor: "#1a2b52",
  },
  {
    slug: "balloon-isles",
    title: "Balloon Isles",
    src: "/art/postcards/balloon-isles.svg",
    draft: true, // TODO: replace with a scan of the real postcard
    note: "Our island drifted east today. Waving from up here!",
    stampColor: "#1b8e8e",
  },
  {
    slug: "the-old-cathedral",
    title: "The Old Cathedral",
    src: "/art/postcards/the-old-cathedral.svg",
    draft: true, // TODO: replace with a scan of the real postcard
    note: "Counted every brick. Lost count twice. Worth it.",
    stampColor: "#6b4aa6",
  },
  {
    slug: "the-paper-fleet",
    title: "The Paper Fleet",
    src: "/art/postcards/the-paper-fleet.svg",
    draft: true, // TODO: replace with a scan of the real postcard
    note: "Met a fish who knows the way home. Following it.",
    stampColor: "#2c56b8",
  },
  {
    slug: "midnight-bloom",
    title: "Midnight Bloom",
    src: "/art/postcards/midnight-bloom.svg",
    draft: true, // TODO: replace with a scan of the real postcard
    note: "The garden only opens after dark. Bring a lantern.",
    stampColor: "#e6ab2e",
  },
];

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
