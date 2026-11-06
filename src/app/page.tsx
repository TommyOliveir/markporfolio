import BackToTop from "@/components/layout/BackToTop";
import Footer from "@/components/layout/Footer";
import Nav from "@/components/layout/Nav";
import { site, siteUrl } from "@/data/site";
// The landing page's sections, in page order.
import Hero from "@/sections/hero/Hero";
import Ribbon from "@/sections/floating-islands/Ribbon";
import Paintings from "@/sections/paintings/Paintings";
import Textiles from "@/sections/textiles/Textiles";
import Postcards from "@/sections/postcards/Postcards";
import About from "@/sections/about/About";
import Collectors from "@/sections/collectors/Collectors";
import Commission from "@/sections/commission/Commission";
import { paintings } from "@/sections/paintings/content";

// Structured data so search engines understand who the artist is and what the artworks are.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${siteUrl}/#artist`,
      name: site.fullName,
      alternateName: site.artist,
      jobTitle: "Artist",
      url: siteUrl,
      image: `${siteUrl}${site.portrait.src}`,
      description: site.tagline,
      address: { "@type": "PostalAddress", addressLocality: "Iloilo City", addressCountry: "PH" },
    },
    ...paintings.map((p) => ({
      "@type": "VisualArtwork",
      name: p.title,
      creator: { "@id": `${siteUrl}/#artist` },
      dateCreated: String(p.year),
      artMedium: p.medium,
      description: p.story,
      image: `${siteUrl}${p.src}`,
    })),
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <Nav />
      <main>
        <Hero />
        <Ribbon />
        <Paintings />
        <Textiles />
        <Postcards />
        <About />
        <Collectors />
        <Commission />
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
