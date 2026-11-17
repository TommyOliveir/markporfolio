import type { Metadata } from "next";
import { site } from "@/data/site";
import FindMark from "@/sections/find-mark/FindMark";
import { postcardShops } from "@/sections/postcards/content";
import { pages } from "@/sections/sections";

// "Where's Mark?": a little 3D walk through the real streets of Molo — from St. Anne's Church, across
// Molo Plaza, to Molo Mansion, where Mark's postcards are sold. Linked from the "Find them in person" card.

const shop = postcardShops[0];
const title = `Where's ${site.artist}? A 3D Walk to Molo Mansion`;
const description = `Find ${site.artist}, an Iloilo artist, in a 3D map of Molo: walk from St. Anne's Church across Molo Plaza to Molo Mansion, where his postcards are sold in person — ${shop.hours}.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: pages.findMark.path },
  // A frame of the 3D map from the air (public/find-mark-share.jpg, grabbed from the walk itself).
  openGraph: {
    type: "website",
    url: pages.findMark.path,
    title,
    description,
    images: [
      {
        url: "/find-mark-share.jpg",
        width: 1200,
        height: 630,
        alt: "Molo Plaza, St. Anne's Church and Molo Mansion in 3D",
      },
    ],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/find-mark-share.jpg"] },
};

export default function FindMarkPage() {
  return (
    <main>
      <FindMark />
    </main>
  );
}
