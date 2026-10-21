import type { Metadata, Viewport } from "next";
import { Cedarville_Cursive, Cinzel, Cormorant_Garamond, EB_Garamond } from "next/font/google";
import { site, siteUrl } from "@/data/site";
import ImageProtection from "@/components/ImageProtection";
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

const title = `${site.artist} · Acrylics, Oils & Watercolour Artist in Iloilo`;
const description =
  "Original ink and watercolour, acrylic and oil paintings by Mark, an Ilonggo artist in Iloilo City, Philippines. Postcards at Molo Mansion, and commissions open.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: `%s · ${site.artist}` },
  description,
  keywords: [
    "Iloilo artist",
    "Ilonggo artist",
    "watercolour paintings Philippines",
    "ink and watercolor art",
    "art commissions Iloilo",
    "Molo Mansion postcards",
    "Iloilo postcards",
  ],
  authors: [{ name: site.fullName }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: "/",
    siteName: `${site.artist} · Artist`,
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
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
      <body className="min-h-screen">
        <ImageProtection />
        {children}
      </body>
    </html>
  );
}
