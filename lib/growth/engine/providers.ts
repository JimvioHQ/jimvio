import type { ProviderFact } from "./types";

/**
 * Prices checked against provider pages on 2026-10-25.
 * A free tier is not treated as Jimvio's current invoice. Account billing is unknown until the provider dashboard is read.
 */
export const PROVIDER_CATALOG: readonly ProviderFact[] = [
  {
    id: "internal-audit",
    name: "In-app SEO and growth audit",
    connected: true,
    priceStatus: "internal_zero",
    summary: "Reads Jimvio routes, metadata, and stored growth events. No third-party request and no charge.",
    source: "Jimvio repository",
    verifiedOn: "2026-10-25",
  },
  {
    id: "search-console",
    name: "Google Search Console API",
    connected: false,
    priceStatus: "free_with_quota",
    summary:
      "Google's pricing page says all Search Console API use is free of charge and subject to usage limits. Jimvio has no Search Console credential configured, so no queries are sent.",
    source: "https://developers.google.com/webmaster-tools/pricing (page updated 2025-08-28, checked 2026-10-25)",
    verifiedOn: "2026-10-25",
  },
  {
    id: "resend",
    name: "Resend",
    connected: false,
    priceStatus: "free_tier_not_guaranteed",
    summary:
      "Official pricing lists a $0 transactional plan for 3,000 emails/month with a 100/day cap, then paid plans from $20/month. Marketing contacts are a separate plan from $0 for 1,000 contacts. Jimvio's current Resend invoice is not read here, so the free plan is not assumed.",
    source: "https://resend.com/pricing.md checked 2026-10-25",
    verifiedOn: "2026-10-25",
  },
  {
    id: "google-ads",
    name: "Google Ads",
    connected: false,
    priceStatus: "unknown",
    summary:
      "No Google Ads account is connected. API access price was not taken from an official billing page in this change. Ad spend is a separate charge and stays disabled.",
    source: "Jimvio environment has no ads account configuration",
    verifiedOn: "2026-10-25",
  },
  {
    id: "meta-ads",
    name: "Meta ads",
    connected: false,
    priceStatus: "unknown",
    summary: "No Meta ads account is connected. Campaign cost is unknown and spend stays disabled.",
    source: "Jimvio environment has no ads account configuration",
    verifiedOn: "2026-10-25",
  },
];

const SEARCH_CONSOLE_ENV = ["GOOGLE_SEARCH_CONSOLE_SITE_URL", "GOOGLE_SEARCH_CONSOLE_CREDENTIALS"] as const;
const ADS_ENV = ["GOOGLE_ADS_CUSTOMER_ID", "META_ADS_ACCOUNT_ID"] as const;

export function integrationPresence(env: NodeJS.ProcessEnv = process.env): {
  searchConsoleConnected: boolean;
  adsAccountConnected: boolean;
  resendConfigured: boolean;
  presentNames: string[];
} {
  const present = (names: readonly string[]) => names.filter((name) => Boolean(env[name]?.trim()));
  const search = present(SEARCH_CONSOLE_ENV);
  const ads = present(ADS_ENV);
  const resend = present(["RESEND_API_KEY"]);
  return {
    searchConsoleConnected: search.length === SEARCH_CONSOLE_ENV.length,
    adsAccountConnected: ads.length > 0,
    resendConfigured: resend.length > 0,
    presentNames: [...search, ...ads, ...resend],
  };
}

export function providerCatalog(env: NodeJS.ProcessEnv = process.env): ProviderFact[] {
  const presence = integrationPresence(env);
  return PROVIDER_CATALOG.map((provider) => {
    if (provider.id === "search-console") return { ...provider, connected: presence.searchConsoleConnected };
    if (provider.id === "resend") return { ...provider, connected: presence.resendConfigured };
    if (provider.id === "google-ads" || provider.id === "meta-ads") {
      return { ...provider, connected: presence.adsAccountConnected };
    }
    return { ...provider };
  });
}
