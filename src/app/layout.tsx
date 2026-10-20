import type { Metadata, Viewport } from "next";
import { Cedarville_Cursive, Cinzel, Cormorant_Garamond, EB_Garamond } from "next/font/google";
import { site } from "@/data/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const cedarville = Cedarville_Cursive({
  variable: "--font-cedarville",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: `${site.artist} · Acrylics, Oils & Watercolour`,
  description: site.tagline,
};

export const viewport: Viewport = {
  themeColor: "#0e1834",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${garamond.variable} ${cinzel.variable} ${cedarville.variable} antialiased`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
