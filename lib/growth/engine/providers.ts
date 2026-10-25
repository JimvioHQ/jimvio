import type { ProviderFact, ProviderVerification } from "./types";

/**
 * Prices checked against provider pages on 2026-10-25.
 * A free tier is not treated as Jimvio's current invoice. Account billing is unknown until the provider dashboard is read.
 */
export const PROVIDER_CATALOG: readonly ProviderFact[] = [
  {
    id: "internal-audit",
    name: "In-app SEO and growth audit",
    connected: true,
    verification: "internal",
    requirement: "No third-party credential is required for the in-app audit.",
    priceStatus: "internal_zero",
    summary: "Reads Jimvio routes, metadata, and stored growth events. No third-party request and no charge.",
    source: "Jimvio repository",
    verifiedOn: "2026-10-25",
  },
  {
    id: "search-console",
    name: "Google Search Console API",
    connected: false,
    verification: "missing",
    requirement: "Set GOOGLE_SEARCH_CONSOLE_SITE_URL and GOOGLE_SEARCH_CONSOLE_CREDENTIALS. Names alone do not prove a query report.",
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
    verification: "missing",
    requirement: "This engine does not send marketing email. A Resend key does not enable that send.",
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
    verification: "missing",
    requirement: "Set GOOGLE_ADS_CUSTOMER_ID, a budget cap, and an explicit spend authorization. The customer id alone does not spend.",
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
    verification: "missing",
    requirement: "Set META_ADS_ACCOUNT_ID, a budget cap, and an explicit spend authorization. The account id alone does not spend.",
    priceStatus: "unknown",
    summary: "No Meta ads account is connected. Campaign cost is unknown and spend stays disabled.",
    source: "Jimvio environment has no ads account configuration",
    verifiedOn: "2026-10-25",
  },
];

const SEARCH_CONSOLE_ENV = ["GOOGLE_SEARCH_CONSOLE_SITE_URL", "GOOGLE_SEARCH_CONSOLE_CREDENTIALS"] as const;

function namePresent(env: NodeJS.ProcessEnv, name: string): boolean {
  return Boolean(env[name]?.trim());
}

export function integrationPresence(env: NodeJS.ProcessEnv = process.env): {
  /** Both Search Console names are set. This does not mean a query report was read. */
  searchConsoleConnected: boolean;
  googleAdsConfigured: boolean;
  metaAdsConfigured: boolean;
  /** At least one ads account name is set. Spend stays disabled either way. */
  adsAccountConnected: boolean;
  resendConfigured: boolean;
  presentNames: string[];
} {
  const search = SEARCH_CONSOLE_ENV.filter((name) => namePresent(env, name));
  const googleAdsConfigured = namePresent(env, "GOOGLE_ADS_CUSTOMER_ID");
  const metaAdsConfigured = namePresent(env, "META_ADS_ACCOUNT_ID");
  const resendConfigured = namePresent(env, "RESEND_API_KEY");
  return {
    searchConsoleConnected: search.length === SEARCH_CONSOLE_ENV.length,
    googleAdsConfigured,
    metaAdsConfigured,
    adsAccountConnected: googleAdsConfigured || metaAdsConfigured,
    resendConfigured,
    presentNames: [
      ...search,
      ...(googleAdsConfigured ? ["GOOGLE_ADS_CUSTOMER_ID"] : []),
      ...(metaAdsConfigured ? ["META_ADS_ACCOUNT_ID"] : []),
      ...(resendConfigured ? ["RESEND_API_KEY"] : []),
    ],
  };
}

function describeProvider(
  provider: ProviderFact,
  verification: ProviderVerification,
  summary: string,
): ProviderFact {
  return {
    ...provider,
    connected: false,
    verification,
    summary,
  };
}

export function providerCatalog(env: NodeJS.ProcessEnv = process.env): ProviderFact[] {
  const presence = integrationPresence(env);
  return PROVIDER_CATALOG.map((provider) => {
    if (provider.id === "search-console") {
      return describeProvider(
        provider,
        presence.searchConsoleConnected ? "names_present_unverified" : "missing",
        presence.searchConsoleConnected
          ? "Both Search Console names are set. No query report was read, so this is not a verified connection."
          : provider.summary,
      );
    }
    if (provider.id === "resend") {
      return describeProvider(
        provider,
        presence.resendConfigured ? "names_present_unverified" : "missing",
        presence.resendConfigured
          ? "RESEND_API_KEY is set. This engine does not send marketing email, and the invoice was not read."
          : provider.summary,
      );
    }
    if (provider.id === "google-ads") {
      return describeProvider(
        provider,
        presence.googleAdsConfigured ? "names_present_unverified" : "missing",
        presence.googleAdsConfigured
          ? "GOOGLE_ADS_CUSTOMER_ID is set. No campaign was submitted and spend stays disabled."
          : provider.summary,
      );
    }
    if (provider.id === "meta-ads") {
      return describeProvider(
        provider,
        presence.metaAdsConfigured ? "names_present_unverified" : "missing",
        presence.metaAdsConfigured
          ? "META_ADS_ACCOUNT_ID is set. No campaign was submitted and spend stays disabled."
          : provider.summary,
      );
    }
    return provider;
  });
}
