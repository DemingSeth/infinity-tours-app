import type { Metadata, Viewport } from "next";
import Script from "next/script";
import ThemeBoot from "@/components/shared/ThemeBoot";
import "./globals.css";

export const metadata: Metadata = {
  title: "Infinity Tours Trip Manager",
  description: "Tour management platform for Infinity Tours + Events",
};

// Phones lay the page out at their real width (no 980px desktop emulation),
// which is what lets the mobile rules in globals.css take effect.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Runs before first paint so the page never flashes the wrong theme: the
// remembered choice wins, otherwise the device setting. ThemeToggle updates the
// same attribute and key.
const THEME_BOOT = `(function(){try{var t=localStorage.getItem("it-theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","light")}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set client-side before hydration, so React must not treat
    // the attribute difference as a mismatch.
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* beforeInteractive: injected into <head> ahead of hydration. */}
        <Script id="theme-boot" strategy="beforeInteractive">{THEME_BOOT}</Script>
        <ThemeBoot />
        {children}
      </body>
    </html>
  );
}
