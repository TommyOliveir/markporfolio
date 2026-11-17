import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import { postcardShops } from "./content";
import { pages, sections } from "@/sections/sections";

// The "find them in person" card: the shops that stock the postcards, with a photo and map.
export default function WhereToBuy() {
  return (
    <Reveal className="relative mx-auto mt-20 max-w-5xl sm:mt-28">
      <div id={sections.whereToBuy.id} className="scroll-mt-10 rounded-2xl  bg-white p-6 text-ink shadow-xl sm:p-12">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
          {/* Intro */}
          <div>
            <p className="caps text-sm font-semibold tracking-[0.16em] text-marigold text-ink/85">Not sold online</p>

            <h3 className="font-display mt-4">
              <span className="block text-4xl leading-tight font-medium tracking-[0.01em] sm:text-5xl">
                Find them in
              </span>

              <span className="-mt-1 block text-7xl leading-[0.9] font-bold tracking-[-0.01em] italic sm:text-8xl lg:text-9xl">
                person
              </span>
            </h3>

            <p className="mt-6 max-w-md text-lg leading-relaxed tracking-[0.01em] text-ink/85 sm:text-xl">
              Real paper, in a real place. Drop by Molo Mansion, flick through the racks, and pick your favourites.
            </p>

            {/* How to find Mark: opens the 3D walk from St. Anne's Church across Molo Plaza to the mansion */}
            <Link
              href={pages.findMark.path}
              className="group mt-8 flex max-w-md items-center gap-4 rounded-2xl border-2 border-ink bg-gold-soft p-4 pr-5 text-ink shadow-[5px_5px_0_0_var(--color-ink)] transition-[translate,box-shadow] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_var(--color-ink)] sm:p-5"
            >
              <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-rose text-card">
                <svg viewBox="0 0 24 24" className="size-7 animate-bounce" fill="currentColor" aria-hidden>
                  <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2Z" />
                </svg>
                <span className="caps absolute -top-1.5 -right-1.5 rounded-full bg-ink px-1.5 py-0.5 text-[0.55rem] tracking-[0.08em] text-paper">
                  3D
                </span>
              </span>
              <span className="min-w-0">
                <span className="caps block text-[0.66rem] tracking-[0.18em] text-rose-ink">How to find Mark</span>
                <span className="font-display block text-[1.65rem] leading-tight font-semibold italic sm:text-3xl">
                  Where&apos;s Mark? Go find him!
                </span>
                <span className="mt-0.5 block text-[0.95rem] leading-snug text-ink/75">
                  Take a 3D stroll across Molo Plaza to his postcards{" "}
                  <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </span>
            </Link>

            <p className="caps mt-6 text-sm font-semibold tracking-[0.16em] text-ink/85">
              Find your next favourite postcard&nbsp;↓
            </p>
          </div>

          {/* Shop locations */}
          <ul className="divide-y divide-ink/30 border-y border-ink/30">
            {postcardShops.map((shop, index) => (
              <li key={shop.name} className="group flex flex-col gap-4 py-5 sm:py-6">
                <div className="min-w-0 flex-1">
                  <p className="caps mb-2 text-sm font-semibold tracking-[0.16em] text-ink/85">Location 0{index + 1}</p>

                  <p className="font-display text-2xl font-medium tracking-[0.01em] sm:text-3xl">{shop.name}</p>

                  <p className="mt-1 text-base leading-relaxed tracking-[0.01em] text-ink/85 sm:text-lg">
                    {shop.address}
                  </p>

                  <p className="caps text-marigold mt-2 text-sm font-semibold tracking-[0.12em] text-ink/85">
                    {shop.hours}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                  <Image
                    src={shop.image}
                    alt={`${shop.name}, a historic mansion in Iloilo City`}
                    width={shop.imageWidth}
                    height={shop.imageHeight}
                    sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 100vw"
                    className="aspect-4/3 w-full rounded-lg border border-ink/20 object-cover sm:aspect-auto sm:h-full"
                  />

                  <iframe
                    title={`Map showing ${shop.name}`}
                    src={shop.mapEmbedUrl}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="aspect-4/3 w-full rounded-lg border border-ink/20 sm:aspect-auto sm:h-full sm:min-h-72"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  );
}
