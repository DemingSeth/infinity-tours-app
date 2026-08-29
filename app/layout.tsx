import type { Metadata, Viewport } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
