import localFont from "next/font/local";

/**
 * Distinctive type pairing scoped to Jimvio Wallet OS — deliberately not
 * Inter/Roboto. Instrument Sans carries interface chrome (nav, labels,
 * tables); Newsreader (incl. italic) renders balances, headline figures and
 * editorial moments so the wallet feels considered rather than "banking app
 * generic". Namespaced with `-os-` so it never collides with the Identity
 * platform's own `--font-identity-*` variables when both are mounted.
 * Files are self-hosted so production builds do not depend on next/font/google.
 */
export const walletSans = localFont({
  src: [
    { path: "../fonts/instrument-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/instrument-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/instrument-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/instrument-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-wallet-os-sans",
  display: "swap",
});

export const walletSerif = localFont({
  src: [
    { path: "../fonts/newsreader-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/newsreader-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/newsreader-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/newsreader-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/newsreader-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../fonts/newsreader-latin-600-italic.woff2", weight: "600", style: "italic" },
  ],
  variable: "--font-wallet-os-serif",
  display: "swap",
});

export const walletFontVariables = `${walletSans.variable} ${walletSerif.variable}`;
