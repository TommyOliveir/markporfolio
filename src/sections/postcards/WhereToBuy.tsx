import Image from "next/image";
import Reveal from "@/components/ui/Reveal";
import { postcardShops } from "./content";
import { sections } from "@/sections/sections";

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
