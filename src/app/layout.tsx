import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@/styles/base.css";

// Polices auto-hébergées (licence SIL OFL) : aucune requête vers un service tiers.
const sans = localFont({ src: "./fonts/PlusJakartaSans.woff2", weight: "400 700", variable: "--font-sans", display: "swap" });
const serif = localFont({
  src: [
    { path: "./fonts/InstrumentSerif.woff2", weight: "400", style: "normal" },
    { path: "./fonts/InstrumentSerif-Italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
});
const mono = localFont({ src: "./fonts/GeistMono.woff2", weight: "400 500", variable: "--font-mono", display: "swap" });

export const metadata: Metadata = { title: "Nerix Ecom" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
