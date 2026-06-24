// Route-scoped fonts for the Quote Builder. The rest of the app loads its fonts
// via a global @import in globals.css; these are loaded with next/font only for
// the quote-builder subtree and exposed as CSS variables that QuoteDocument
// references by var(--font-*). Global font loading is unchanged.
import { Oswald, Mulish, Pinyon_Script } from "next/font/google";

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

export const quoteFontVars = `${oswald.variable} ${mulish.variable} ${pinyon.variable}`;
