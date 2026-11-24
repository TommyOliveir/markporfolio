import type { Metadata, Viewport } from "next";
import { Cedarville_Cursive, Cinzel, Cormorant_Garamond, EB_Garamond } from "next/font/google";
import Script from "next/script";
import { site, siteUrl } from "@/data/site";
import ImageProtection from "@/components/layout/ImageProtection";
import "./globals.css";

// Fonts: text always paints straight away in a matched fallback ("swap"), then switches to the web font
// once it arrives, so a slow connection never leaves the page blank.
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  display: "swap",
});

// The handwriting font only appears below the first screen, so it isn't preloaded: it doesn't compete with
// the hero's fonts and scripts on a slow connection.
const cedarville = Cedarville_Cursive({
  variable: "--font-cedarville",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
});

// The homepage title and description lead with what people search for: an artist in Iloilo.
const title = `${site.artist} — Iloilo Artist · Paintings, Postcards & Commissions | Flying Treehouse`;
const description = `Iloilo artist ${site.artist}: original ink, watercolour, acrylic and oil paintings of Iloilo City and imaginary worlds, hand-painted textile designs, and postcards sold at Molo Mansion. Commissions open.`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // Other pages set their own title; it's shown as "<page title> | Flying Treehouse".
  title: { default: title, template: "%s | Flying Treehouse" },
  description,
  applicationName: "Flying Treehouse",
  authors: [{ name: site.fullName, url: siteUrl }],
  creator: site.fullName,
  category: "art",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: "/",
    siteName: "Flying Treehouse",
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
  // Google Search Console: set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the code from its "HTML tag" method.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#0e1834",
};

// Only a well-formed container ID goes into the snippet below.
const gtmId = /^GTM-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GTM_ID ?? "") ? process.env.NEXT_PUBLIC_GTM_ID : undefined;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-PH"
      className={`${cormorant.variable} ${garamond.variable} ${cinzel.variable} ${cedarville.variable} antialiased`}
    >
      <body className="min-h-screen">
        <ImageProtection />
        {children}
        {/* Google Tag Manager (only when the container ID is set, see .env.example). Its script is big
            (~180 KB), so it loads once the page has finished loading and the browser is idle, rather than
            competing with the first screen. */}
        {gtmId && (
          <Script id="gtm" strategy="lazyOnload">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
          </Script>
        )}
      </body>
    </html>
  );
}
