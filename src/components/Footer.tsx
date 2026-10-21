import { site } from "@/data/site";
import { CompassStar } from "./Ornaments";

export default function Footer() {
  return (
    <footer className="border-t border-gold/20 bg-night px-4 pt-16 pb-10 text-paper sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
        <CompassStar className="size-7 text-gold" />
        <p className="font-display text-5xl italic">{site.artist}</p>
        <p className="max-w-md text-lg text-paper/65 italic">
          Thank you for wandering through. May your skies always have a balloon or two in them.
        </p>
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-paper/70">
          <a href="#gallery" className="caps ink-link pb-1 hover:text-paper">
            Paintings
          </a>
          <a href="#postcards" className="caps ink-link pb-1 hover:text-paper">
            Postcards
          </a>
          <a href="#about" className="caps ink-link pb-1 hover:text-paper">
            About
          </a>
          <a href="#commission" className="caps ink-link pb-1 hover:text-paper">
            Commission
          </a>
          {site.instagram && (
            <a
              href={site.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="caps ink-link pb-1 hover:text-paper"
            >
              Instagram
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
