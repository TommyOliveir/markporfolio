import type { MetadataRoute } from "next";
import { site, siteUrl } from "@/data/site";
import { collectors } from "@/sections/collectors/content";
import { paintings } from "@/sections/paintings/content";
import { postcards, postcardShops } from "@/sections/postcards/content";
import { pages } from "@/sections/sections";
import { textiles } from "@/sections/textiles/content";

// Every page, with the images on it, so search engines (and Google Images) find all the artwork.
export default function sitemap(): MetadataRoute.Sitemap {
  const abs = (path: string) => `${siteUrl}${path}`;
  const lastModified = new Date();
  const realPostcards = postcards.filter((c) => !c.draft);

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
      images: [
        ...paintings.map((p) => p.src),
        ...textiles.map((t) => t.src),
        ...realPostcards.map((c) => c.src),
        ...collectors.flatMap((c) => (c.photo ? [c.photo.src] : [])),
        ...postcardShops.map((s) => s.image),
        site.portrait.src,
        site.sketchcrawl.image.src,
      ].map(abs),
    },
    {
      url: abs(pages.iloilo.path),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
      images: [
        ...realPostcards.map((c) => c.src),
        ...postcardShops.map((s) => s.image),
        site.sketchcrawl.image.src,
      ].map(abs),
    },
    ...paintings.map((p) => ({
      url: abs(pages.painting(p.slug)),
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.7,
      images: [abs(p.src)],
    })),
  ];
}
