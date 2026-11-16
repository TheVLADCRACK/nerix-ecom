import type { Metadata } from "next";
import "@/styles/platform.css";

export const metadata: Metadata = {
  title: { default: "Nerix Ecom", template: "%s · Nerix Ecom" },
  icons: { icon: "/nerix-64.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Nerix", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <div className="nx">{children}</div>;
}
