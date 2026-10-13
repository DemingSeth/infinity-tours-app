// Route-scoped fonts for the Quote Builder. The rest of the app loads its fonts
// via a global @import in globals.css; these are loaded with next/font only for
// the quote-builder subtree and exposed as CSS variables that QuoteDocument
// references by var(--font-*). Global font loading is unchanged.
import { Oswald, Mulish, Pinyon_Script, Fjalla_One, Lato, Yellowtail } from "next/font/google";

export const oswald = Oswald({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

export const mulish = Mulish({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-mulish",
  display: "swap",
});

export const pinyon = Pinyon_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pinyon",
  display: "swap",
});

// Pricing quote faces (October 2026), matching the Piktochart quotes: a
// condensed display face for headings, a light italic for body text and a
// brush script for the destination line.
export const fjalla = Fjalla_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-fjalla",
  display: "swap",
});

export const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-lato",
  display: "swap",
});

export const yellowtail = Yellowtail({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
  display: "swap",
});

export const quoteFontVars = `${oswald.variable} ${mulish.variable} ${pinyon.variable} ${fjalla.variable} ${lato.variable} ${yellowtail.variable}`;
