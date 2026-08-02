import { Instrument_Sans, Newsreader } from "next/font/google";

/**
 * Distinctive type pairing scoped to Jimvio Wallet OS — deliberately not
 * Inter/Roboto. Instrument Sans carries interface chrome (nav, labels,
 * tables); Newsreader (incl. italic) renders balances, headline figures and
 * editorial moments so the wallet feels considered rather than "banking app
 * generic". Namespaced with `-os-` so it never collides with the Identity
 * platform's own `--font-identity-*` variables when both are mounted.
 */
export const walletSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-wallet-os-sans",
  display: "swap",
});

export const walletSerif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-wallet-os-serif",
  display: "swap",
});

export const walletFontVariables = `${walletSans.variable} ${walletSerif.variable}`;
