import About from "@/components/About";
import Commission from "@/components/Commission";
import Footer from "@/components/Footer";
import Gallery from "@/components/Gallery";
import Hero from "@/components/Hero";
import Nav from "@/components/Nav";
import Postcards from "@/components/Postcards";
import Ribbon from "@/components/Ribbon";
import { paintings, site, siteUrl } from "@/data/site";

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
        <Gallery />
        <Postcards />
        <About />
        <Commission />
      </main>
      <Footer />
    </>
  );
}
