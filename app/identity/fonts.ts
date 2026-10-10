import localFont from "next/font/local";

/**
 * Distinctive type pairing scoped to the Jimvio Identity Platform (JIP).
 * Deliberately not Inter/Roboto/Arial — Instrument Sans for interface
 * chrome, Newsreader for editorial headlines/quotes.
 * Files are self-hosted so production builds do not depend on next/font/google.
 */
export const instrumentSans = localFont({
  src: [
    { path: "../fonts/instrument-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/instrument-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/instrument-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/instrument-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-identity-sans",
  display: "swap",
});

export const newsreader = localFont({
  src: [
    { path: "../fonts/newsreader-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/newsreader-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/newsreader-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/newsreader-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/newsreader-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../fonts/newsreader-latin-600-italic.woff2", weight: "600", style: "italic" },
  ],
  variable: "--font-identity-serif",
  display: "swap",
});

export const identityFontVariables = `${instrumentSans.variable} ${newsreader.variable}`;
