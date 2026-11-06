// Structured data (schema.org JSON-LD): tells search engines who Mark is, that Flying Treehouse is an
// art business in Iloilo City, where the postcards are sold, and what each artwork is.
// Rendered with <JsonLd> (src/components/ui/JsonLd.tsx) on the homepage and the painting pages.
import { site, siteUrl } from "@/data/site";
import { paintingAlt, type Painting } from "@/sections/paintings/content";

export const ids = {
  website: `${siteUrl}/#website`,
  artist: `${siteUrl}/#artist`,
  business: `${siteUrl}/#business`,
  moloMansion: `${siteUrl}/#molo-mansion`,
};

const iloilo = {
  "@type": "PostalAddress",
  addressLocality: "Iloilo City",
  addressRegion: "Iloilo",
  addressCountry: "PH",
};

const abs = (path: string) => `${siteUrl}${path}`;

export const websiteNode = () => ({
  "@type": "WebSite",
  "@id": ids.website,
  url: siteUrl,
  name: "Flying Treehouse",
  description: `Art by ${site.artist}, an Iloilo artist: paintings, textile designs and postcards.`,
  inLanguage: "en-PH",
  publisher: { "@id": ids.business },
});

export const artistNode = () => ({
  "@type": "Person",
  "@id": ids.artist,
  name: site.fullName,
  alternateName: site.artist,
  jobTitle: "Artist",
  description: `Ilonggo artist in Iloilo City, Philippines. ${site.intro}`,
  url: siteUrl,
  image: abs(site.portrait.src),
  address: iloilo,
  homeLocation: { "@type": "City", name: "Iloilo City" },
  knowsAbout: [
    "Ink drawing",
    "Watercolour painting",
    "Acrylic painting",
    "Oil painting",
    "Textile design",
    "Urban sketching",
  ],
  sameAs: [site.facebook].filter(Boolean),
});

export const businessNode = () => ({
  "@type": "LocalBusiness",
  "@id": ids.business,
  name: "Flying Treehouse",
  description: `Original paintings, hand-painted textile designs, postcards and art commissions by ${site.artist}, an Iloilo artist.`,
  url: siteUrl,
  image: abs(site.portrait.src),
  founder: { "@id": ids.artist },
  address: iloilo,
  areaServed: { "@type": "City", name: "Iloilo City" },
  telephone: site.phoneRaw,
  email: site.contactEmail || undefined,
  sameAs: [site.facebook].filter(Boolean),
  makesOffer: {
    "@type": "Offer",
    itemOffered: {
      "@type": "Service",
      name: "Art commissions",
      description:
        "An original ink, watercolour, acrylic or oil piece painted to order — your city, your street, your daydream.",
    },
  },
});

export type Shop = {
  name: string;
  address: string;
  streetAddress: string;
  openingHours: string;
  geo: { latitude: number; longitude: number };
  image: string;
};

/** A shop that sells the postcards, e.g. Molo Mansion. */
export const shopNode = (shop: Shop) => ({
  "@type": "Place",
  "@id": ids.moloMansion,
  name: shop.name,
  alternateName: shop.address.split(",")[0],
  address: { ...iloilo, streetAddress: shop.streetAddress },
  geo: { "@type": "GeoCoordinates", ...shop.geo },
  openingHours: shop.openingHours,
  image: abs(shop.image),
  description: `Where to buy postcards by ${site.artist} in person.`,
});

export const paintingNode = (p: Painting) => ({
  "@type": "VisualArtwork",
  "@id": abs(`/paintings/${p.slug}#artwork`),
  url: abs(`/paintings/${p.slug}`),
  name: p.title,
  creator: { "@id": ids.artist },
  dateCreated: String(p.year),
  artform: "Painting",
  artMedium: p.medium,
  size: p.size,
  description: p.story,
  image: { "@type": "ImageObject", url: abs(p.src), width: p.width, height: p.height, caption: paintingAlt(p) },
  locationCreated: { "@type": "City", name: "Iloilo City" },
});

/** Any other artwork shown on the site (textile prints, postcards). */
export const artworkNode = (a: { slug: string; title: string; src: string; artform: string; description: string }) => ({
  "@type": "VisualArtwork",
  "@id": abs(`/#${a.slug}`),
  name: a.title,
  creator: { "@id": ids.artist },
  artform: a.artform,
  description: a.description,
  image: abs(a.src),
});

export const graph = (...nodes: object[]) => ({ "@context": "https://schema.org", "@graph": nodes });
