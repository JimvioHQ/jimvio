import { Instrument_Sans, Newsreader } from "next/font/google";

/**
 * Distinctive type pairing scoped to the Jimvio Identity Platform (JIP).
 * Deliberately not Inter/Roboto/Arial — Instrument Sans for interface
 * chrome, Newsreader for editorial headlines/quotes.
 */
export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-identity-sans",
  display: "swap",
});

export const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-identity-serif",
  display: "swap",
});

export const identityFontVariables = `${instrumentSans.variable} ${newsreader.variable}`;
