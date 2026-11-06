import Link from "next/link";
import { href, sections } from "@/sections/sections";

// Slim top bar for the standalone pages (a painting's page, the Iloilo page): the site name back
// to the homepage, plus links to the paintings and to commissions.
export default function PageHeader() {
  return (
    <header className="border-b border-ink/10 bg-paper/90 text-ink backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-5 sm:px-8">
        <Link
          href="/"
          title="Back to the homepage"
          className="font-display text-2xl font-medium whitespace-nowrap italic sm:text-3xl"
        >
          Flying Treehouse
        </Link>
        <div className="flex items-center gap-5 sm:gap-8">
          <a
            href={href(sections.paintings, true)}
            className="caps ink-link hidden pb-1 text-[0.82rem] tracking-[0.16em] opacity-80 hover:opacity-100 sm:inline"
          >
            All paintings
          </a>
          <a
            href={href(sections.commission, true)}
            className="caps rounded-full border border-ink/40 px-5 py-2.5 text-[0.82rem] transition-colors hover:bg-ink hover:text-paper"
          >
            Commission
          </a>
        </div>
      </nav>
    </header>
  );
}
