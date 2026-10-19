import About from "@/components/About";
import Commission from "@/components/Commission";
import Footer from "@/components/Footer";
import Gallery from "@/components/Gallery";
import Hero from "@/components/Hero";
import Nav from "@/components/Nav";
import Postcards from "@/components/Postcards";
import Ribbon from "@/components/Ribbon";

export default function Home() {
  return (
    <>
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
