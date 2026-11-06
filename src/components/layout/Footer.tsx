import Link from "next/link";
import { site } from "@/data/site";
import { CompassStar } from "@/components/ui/Ornaments";
import { href, navSections, pages, sections } from "@/sections/sections";

// `fromOtherPage`: on the painting and Iloilo pages, section links point back to the homepage.
export default function Footer({ fromOtherPage = false }: { fromOtherPage?: boolean }) {
  return (
    <footer className="border-t border-gold/20 bg-night px-4 pt-16 pb-10 text-paper sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
        <CompassStar className="size-7 text-gold" />
        <div>
          <p className="font-display text-5xl italic">Flying Treehouse</p>
          <p className="font-script mt-2 text-xl text-paper/70">Art by {site.artist}</p>
        </div>
        <p className="max-w-md text-lg text-paper/65 italic">
          Thank you for wandering through. May your skies always have a balloon or two in them.
        </p>
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-paper/70">
          {[...navSections, sections.commission].map((s) => (
            <a key={s.id} href={href(s, fromOtherPage)} className="caps ink-link pb-1 hover:text-paper">
              {s.label}
            </a>
          ))}
          <Link href={pages.iloilo.path} className="caps ink-link pb-1 hover:text-paper">
            {pages.iloilo.label}
          </Link>
          {site.facebook && (
            <a
              href={site.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="caps ink-link pb-1 hover:text-paper"
            >
              Facebook
            </a>
          )}
        </nav>
        <p className="mt-4 text-sm text-paper/40">
          © {site.fullName}. All artwork is original — please ask before sharing.
        </p>
      </div>
    </footer>
  );
}
