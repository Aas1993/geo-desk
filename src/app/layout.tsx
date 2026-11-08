import type { Metadata, Viewport } from "next";
import { Inter_Tight, Space_Grotesk, JetBrains_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const ui = Inter_Tight({ variable: "--font-ui", subsets: ["latin"] });
const serif = Space_Grotesk({ variable: "--font-serif", subsets: ["latin"] }); // display face (class .display)
const mono = JetBrains_Mono({ variable: "--font-mono-ui", subsets: ["latin"] });
const arabic = IBM_Plex_Sans_Arabic({ variable: "--font-arabic", subsets: ["arabic"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Geo Desk",
  description: "A live world map with a country dossier for every state — economy, trade, military, society and news.",
};
export const viewport: Viewport = { themeColor: "#04070d", width: "device-width", initialScale: 1 };

// Applies saved theme/language before paint so there is no flash.
const boot = `try{var s=JSON.parse(localStorage.getItem('gd-prefs')||'{}');var d=document.documentElement;
if(s.theme)d.dataset.theme=s.theme;if(s.lang){d.lang=s.lang;d.dir=s.lang==='ar'?'rtl':'ltr'}
if(s.scale)d.style.setProperty('--text-scale',s.scale)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${ui.variable} ${serif.variable} ${mono.variable} ${arabic.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: boot }} /></head>
      <body>{children}</body>
    </html>
  );
}
