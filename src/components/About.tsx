import Image from "next/image";
import { site } from "@/data/site";
import { CompassStar, Flourish } from "./Ornaments";
import Reveal from "./Reveal";
import Watercolor from "./Watercolor";

export default function About() {
  return (
    <section id="about" className="relative px-4 py-32 sm:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-16 md:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="relative mx-auto w-full max-w-sm">
          <Watercolor
            seed={5}
            className="-inset-16! size-auto!"
            blooms={[
              { x: 30, y: 25, r: 30, color: "#1b8e8e", opacity: 0.35 },
              { x: 70, y: 70, r: 28, color: "#d63c62", opacity: 0.3 },
              { x: 75, y: 20, r: 18, color: "#f2a516", opacity: 0.35 },
            ]}
          />
          {/* Photo of Mark in a matted print, like the gallery pieces */}
          <figure className="print relative p-3 sm:p-4">
            <Image
              src={site.portrait.src}
              alt={`${site.artist} standing beside one of his paintings`}
              width={site.portrait.width}
              height={site.portrait.height}
              sizes="(min-width: 768px) 384px, 90vw"
              className="h-auto w-full"
            />
          </figure>
          <p className="font-script mt-4 text-center text-xl text-ink-soft">with one of my originals</p>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="caps text-rose">III &nbsp;·&nbsp; The Artist</p>
          <h2 className="font-display mt-4 text-5xl leading-[1.02] font-medium sm:text-6xl">
            Hello, I&apos;m <em className="text-teal">{site.artist}</em>
          </h2>
          <Flourish className="mt-5 w-40 text-ink/50" />
          <p className="font-display mt-6 text-2xl leading-snug text-ink">{site.intro}</p>
          {site.about.map((para) => (
            <p key={para.slice(0, 20)} className="mt-4 leading-relaxed text-ink-soft">
              {para}
            </p>
          ))}
          <ul className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink/15 pt-6">
            {site.materials.map((m, i) => (
              <li key={m} className="flex items-center gap-4">
                {i > 0 && <CompassStar points={4} className="size-2.5 text-rose" />}
                <span className="caps text-ink-soft">{m}</span>
              </li>
            ))}
          </ul>
          <p className="font-script mt-8 text-3xl text-ink">{site.artist}</p>
        </Reveal>
      </div>

      <Sketchcrawl />
    </section>
  );
}

function Sketchcrawl() {
  const { name, image, caption, text } = site.sketchcrawl;
  return (
    <div className="mx-auto mt-32 grid max-w-6xl items-center gap-14 md:grid-cols-[1.1fr_0.9fr]">
      <Reveal className="order-2 md:order-1">
        <p className="caps text-rose">Also by {site.artist} &nbsp;·&nbsp; Community</p>
        <h3 className="font-display mt-4 text-5xl leading-[1.02] font-medium sm:text-6xl">
          <em className="text-teal">{name}</em>
        </h3>
        <Flourish className="mt-5 w-40 text-ink/50" />
        {text.map((para, i) => (
          <p
            key={para.slice(0, 20)}
            className={i === 0 ? "font-display mt-6 text-2xl leading-snug text-ink" : "mt-4 leading-relaxed text-ink-soft"}
          >
            {para}
          </p>
        ))}
        <a href="#commission" className="btn btn-ink mt-8">
          Ask about the next crawl
        </a>
      </Reveal>

      <Reveal delay={0.15} className="order-1 mx-auto w-full max-w-sm md:order-2">
        <figure className="print rotate-2 p-3 transition-transform duration-500 hover:rotate-0">
          <Image
            src={image.src}
            alt={`Poster for ${caption}, with a watercolour sketch of a mansion`}
            width={image.width}
            height={image.height}
            sizes="(min-width: 768px) 384px, 90vw"
            className="h-auto w-full"
          />
          <figcaption className="font-script mt-3 text-center text-lg text-ink-soft">{caption}</figcaption>
        </figure>
      </Reveal>
    </div>
  );
}
