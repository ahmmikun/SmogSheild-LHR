import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SmogShield-LHR — Lahore Air Quality & AI Commute Optimizer",
  description:
    "Real-time Lahore smog analytics: US AQI, WHO multiple, cigarette equivalence, cleanest commute hours, and an 8B open-weight AI planner.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090D16" },
    { media: "(prefers-color-scheme: light)", color: "#F1F5F9" },
  ],
};

// Runs before first paint: applies the saved theme (or the OS preference)
// so there is no flash of the wrong theme. Dark is the design default.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("smogshield-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.classList.toggle("dark",t==="dark")}catch(e){document.documentElement.classList.add("dark")}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
