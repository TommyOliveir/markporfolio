import BackToTop from "@/components/layout/BackToTop";
import Footer from "@/components/layout/Footer";
import Nav from "@/components/layout/Nav";
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
import { postcardAlt, postcards, postcardShops } from "@/sections/postcards/content";
import { textileAlt, textiles } from "@/sections/textiles/content";
import JsonLd from "@/components/ui/JsonLd";
import { artistNode, artworkNode, businessNode, graph, paintingNode, shopNode, websiteNode } from "@/lib/schema";

// Structured data for search engines: the site, Mark, Flying Treehouse as an Iloilo art business,
// Molo Mansion where the postcards are sold, and every artwork shown on the page.
const structuredData = graph(
  websiteNode(),
  artistNode(),
  businessNode(),
  ...postcardShops.map(shopNode),
  ...paintings.map(paintingNode),
  ...textiles.map((t) =>
    artworkNode({ slug: t.slug, title: t.title, src: t.src, artform: "Textile design", description: textileAlt(t) }),
  ),
  ...postcards
    .filter((c) => !c.draft)
    .map((c) =>
      artworkNode({ slug: c.slug, title: c.title, src: c.src, artform: "Postcard", description: postcardAlt(c) }),
    ),
);

export default function Home() {
  return (
    <>
      <JsonLd data={structuredData} />
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
