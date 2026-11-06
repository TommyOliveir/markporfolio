import type { Metadata } from "next";
import Image from "next/image";
import BackToTop from "@/components/layout/BackToTop";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/layout/PageHeader";
import JsonLd from "@/components/ui/JsonLd";
import { Flourish } from "@/components/ui/Ornaments";
import { site, siteUrl } from "@/data/site";
import { artistNode, artworkNode, businessNode, graph, ids, shopNode } from "@/lib/schema";
import { postcardAlt, postcards, postcardShops } from "@/sections/postcards/content";
import WhereToBuy from "@/sections/postcards/WhereToBuy";
import { href, pages, sections } from "@/sections/sections";

// "Iloilo in ink & watercolour": the page that answers Iloilo searches — the Iloilo City postcard,
// where to buy it at Molo Mansion, the Sketchcrawl sa Molo, and commissions of Iloilo places.
// TODO: add a few lines in Mark's own words about drawing Iloilo, and more Iloilo pieces as they come.

const title = `Iloilo in Ink & Watercolour — Art by ${site.artist}, Iloilo Artist`;
const description = `Iloilo City as drawn by ${site.artist}, an Ilonggo artist: the Iloilo City postcard, sold in person at Molo Mansion, the Sketchcrawl sa Molo drawing meet-ups, and commissions of your own corner of Iloilo.`;

const postcard = postcards.find((c) => c.slug === "iloilo-city")!;
const shop = postcardShops[0];
const sketch = site.sketchcrawl;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: pages.iloilo.path },
  // The Iloilo City postcard is this page's share image (it replaces the site-wide one here).
  openGraph: {
    type: "article",
    url: pages.iloilo.path,
    title,
    description,
    images: [
      { url: postcard.src, width: postcard.size!.width, height: postcard.size!.height, alt: postcardAlt(postcard) },
    ],
  },
  twitter: { card: "summary_large_image", title, description, images: [postcard.src] },
};

export default function IloiloPage() {
  const page = {
    "@type": "WebPage",
    "@id": `${siteUrl}${pages.iloilo.path}#page`,
    url: `${siteUrl}${pages.iloilo.path}`,
    name: title,
    description,
    inLanguage: "en-PH",
    about: { "@type": "City", name: "Iloilo City", containedInPlace: { "@type": "Country", name: "Philippines" } },
    author: { "@id": ids.artist },
    isPartOf: { "@id": ids.website },
  };

  return (
    <>
      <JsonLd
        data={graph(
          page,
          artistNode(),
          businessNode(),
          shopNode(shop),
          artworkNode({
            slug: postcard.slug,
            title: postcard.title,
            src: postcard.src,
            artform: "Postcard",
            description: postcardAlt(postcard),
          }),
        )}
      />
      <PageHeader />
      <main data-protect>
        {/* Intro */}
        <section className="px-4 pt-16 pb-10 text-center sm:px-6 sm:pt-24">
          <p className="caps text-rose-ink">Flying Treehouse · Iloilo City</p>
          <h1 className="font-display mx-auto mt-4 max-w-3xl text-5xl leading-[1.02] font-medium text-balance sm:text-6xl">
            Iloilo in ink &amp; watercolour
          </h1>
          <Flourish className="mx-auto mt-5 w-44 text-ink/50" />
          <p className="mx-auto mt-6 max-w-2xl text-xl text-pretty text-ink-soft italic">
            I&apos;m an Ilonggo artist, and I draw the City of Love the way I draw everything — a fine ink line first,
            stroke by stroke, then colour that refuses to stay inside it. Here&apos;s where Iloilo turns up in my work,
            and where to find it in person.
          </p>
        </section>

        {/* The Iloilo City postcard */}
        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
            <div className="print mx-auto w-full max-w-sm p-3">
              <Image
                src={postcard.src}
                alt={postcardAlt(postcard)}
                width={postcard.size!.width}
                height={postcard.size!.height}
                sizes="(min-width: 768px) 384px, 90vw"
                className="h-auto w-full"
              />
            </div>
            <div>
              <p className="caps text-rose-ink">The postcard</p>
              <h2 className="font-display mt-3 text-4xl leading-tight font-medium sm:text-5xl">Iloilo City</h2>
              <p className="mt-5 text-lg leading-relaxed text-ink-soft">
                One card, the whole city: {postcard.description}.
              </p>
              <p className="font-script mt-6 text-2xl text-ink-soft">“{postcard.note}”</p>
              <p className="mt-6 text-ink-soft">
                Printed on heavy card and sold only in person, at {shop.name} — {shop.hours.replace("- ", "–")}.
              </p>
            </div>
          </div>
        </section>

        {/* Where to buy: Molo Mansion */}
        <section className="bg-paper-deep/60 px-4 py-16 sm:px-6">
          <WhereToBuy />
        </section>

        {/* Sketchcrawl sa Molo */}
        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
            <div>
              <p className="caps text-rose-ink">Drawing Iloilo together</p>
              <h2 className="font-display mt-3 text-4xl leading-tight font-medium sm:text-5xl">
                {sketch.caption.split(" · ")[0]}
              </h2>
              {sketch.text.map((t) => (
                <p key={t} className="mt-5 text-lg leading-relaxed text-ink-soft">
                  {t}
                </p>
              ))}
            </div>
            <figure className="print mx-auto w-full max-w-sm -rotate-1 p-3 pb-4">
              <Image
                src={sketch.image.src}
                alt={`Poster for ${sketch.caption}, with a watercolour sketch of a mansion in Molo, Iloilo City`}
                width={sketch.image.width}
                height={sketch.image.height}
                sizes="(min-width: 768px) 384px, 90vw"
                className="h-auto w-full"
              />
              <figcaption className="font-script mt-3 text-center text-xl text-ink-soft">{sketch.caption}</figcaption>
            </figure>
          </div>
        </section>

        {/* Commission */}
        <section className="bg-night px-4 py-20 text-center text-paper sm:px-6">
          <p className="caps text-gold">Commissions open</p>
          <h2 className="font-display mx-auto mt-4 max-w-2xl text-4xl leading-tight font-medium text-balance sm:text-5xl">
            Your corner of Iloilo, in ink &amp; watercolour
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-paper/75 italic">
            Your street, your family&apos;s old house, the plaza where you met — drawn by an Ilonggo artist and painted
            just for you.
          </p>
          <a href={href(sections.commission, true)} className="btn btn-gold mt-9">
            Commission a piece
          </a>
        </section>
      </main>
      <Footer fromOtherPage />
      <BackToTop />
    </>
  );
}
