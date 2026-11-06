import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import BackToTop from "@/components/layout/BackToTop";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/layout/PageHeader";
import JsonLd from "@/components/ui/JsonLd";
import { site, siteUrl } from "@/data/site";
import { artistNode, graph, paintingNode } from "@/lib/schema";
import { paintingAlt, paintings } from "@/sections/paintings/content";
import { href, pages, sections } from "@/sections/sections";

// One page per painting, so each can be found in search and image results on its own.
// All nine are built ahead of time; any other slug gets a 404 (notFound() below).

export function generateStaticParams() {
  return paintings.map((p) => ({ slug: p.slug }));
}

const find = (slug: string) => paintings.find((p) => p.slug === slug);

export async function generateMetadata({ params }: PageProps<"/paintings/[slug]">): Promise<Metadata> {
  const p = find((await params).slug);
  if (!p) return {};
  const title = `${p.title} — ${p.medium} by ${site.artist}, Iloilo Artist`;
  const description = `${p.story} An original ${p.medium.toLowerCase()} (${p.size}, ${p.year}) by ${site.artist}, an Ilonggo artist in Iloilo City.`;
  const image = { url: p.src, width: p.width, height: p.height, alt: paintingAlt(p) };
  return {
    title,
    description,
    alternates: { canonical: pages.painting(p.slug) },
    openGraph: { type: "article", url: pages.painting(p.slug), title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function PaintingPage({ params }: PageProps<"/paintings/[slug]">) {
  const { slug } = await params;
  const p = find(slug);
  if (!p) notFound();
  const i = paintings.indexOf(p);
  const prev = paintings[(i - 1 + paintings.length) % paintings.length];
  const next = paintings[(i + 1) % paintings.length];

  const breadcrumbs = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Flying Treehouse", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Paintings", item: `${siteUrl}${href(sections.paintings, true)}` },
      { "@type": "ListItem", position: 3, name: p.title, item: `${siteUrl}${pages.painting(p.slug)}` },
    ],
  };

  return (
    <>
      <JsonLd data={graph(artistNode(), paintingNode(p), breadcrumbs)} />
      <PageHeader />
      <main data-protect className="px-4 py-14 sm:px-6 sm:py-20">
        <nav aria-label="Breadcrumb" className="caps mx-auto max-w-6xl text-[0.62rem] text-ink-faint">
          <Link href="/" className="ink-link pb-0.5 hover:text-ink">
            Home
          </Link>
          <span className="mx-2">/</span>
          <a href={href(sections.paintings, true)} className="ink-link pb-0.5 hover:text-ink">
            Paintings
          </a>
          <span className="mx-2">/</span>
          <span className="text-ink-soft">{p.title}</span>
        </nav>

        <article className="mx-auto mt-8 grid max-w-6xl items-start gap-10 md:grid-cols-[1.3fr_1fr] md:gap-14">
          <div className="print p-3 sm:p-4">
            <Image
              src={p.src}
              alt={paintingAlt(p)}
              width={p.width}
              height={p.height}
              priority
              sizes="(min-width: 768px) 55vw, 100vw"
              className="mx-auto h-auto max-h-[80svh] w-auto"
            />
          </div>

          <div className="md:sticky md:top-10">
            <p className="caps text-rose-ink">
              No. {String(i + 1).padStart(2, "0")} · {p.category}
            </p>
            <h1 className="font-display mt-3 text-4xl leading-tight font-medium sm:text-5xl">{p.title}</h1>
            <p className="mt-4 text-xl leading-snug text-ink-soft italic">{p.story}</p>
            <dl className="mt-8 divide-y divide-ink/10 border-y border-ink/15">
              {[
                ["Artist", `${site.artist}, Iloilo City`],
                ["Year", p.year],
                ["Medium", p.medium],
                ["Size", p.size],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="caps text-ink-faint">{k}</dt>
                  <dd className="font-display text-right text-lg">{v}</dd>
                </div>
              ))}
            </dl>
            <a href={href(sections.commission, true)} className="btn btn-ink mt-8">
              Commission something like this
            </a>
            <p className="mt-6 text-ink-soft">
              {site.artist} is an Ilonggo artist who draws real places in fine ink, then lets the colour run.{" "}
              <Link href={pages.iloilo.path} className="ink-link pb-0.5 text-ink hover:text-rose">
                See Iloilo in his ink and watercolour
              </Link>
              .
            </p>
          </div>
        </article>

        <nav
          aria-label="More paintings"
          className="mx-auto mt-16 flex max-w-6xl justify-between gap-6 border-t border-ink/15 pt-6"
        >
          <Link href={pages.painting(prev.slug)} className="group max-w-[45%]">
            <span className="caps text-[0.62rem] text-ink-faint">← Previous</span>
            <span className="font-display mt-1 block text-xl italic group-hover:text-rose">{prev.title}</span>
          </Link>
          <Link href={pages.painting(next.slug)} className="group max-w-[45%] text-right">
            <span className="caps text-[0.62rem] text-ink-faint">Next →</span>
            <span className="font-display mt-1 block text-xl italic group-hover:text-rose">{next.title}</span>
          </Link>
        </nav>
      </main>
      <Footer fromOtherPage />
      <BackToTop />
    </>
  );
}
