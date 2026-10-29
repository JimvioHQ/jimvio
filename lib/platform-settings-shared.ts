/** Types, defaults, and pure helpers — safe to import from client components. */

import { JIMVIO_SUPPORT_EMAIL } from "@/lib/contact-email";

export type FeesSettings = {
  min_payout_rwf: number;
  default_affiliate_commission_percent: number;
  shopify_default_platform_commission_percent: number | null;
  platform_fee_percent: number;
  platform_fee_fixed_rwf: number;
};

export type SocialProofSettings = {
  success_rate_display: string;
  countries_display: string;
  fallback_verified_vendors: string;
  fallback_total_products: string;
};

export type TrustBarItem = { title: string; desc: string };

/** Public navbar link — icon is chosen automatically from `href` when omitted on client. */
export type NavLinkConfig = { label: string; href: string; mobileLabel?: string };

export type MarketingSettings = {
  trending_search_keywords: string[];
  affiliate_value_props: string[];
  trust_bar: TrustBarItem[];
  /** Main nav (desktop + mobile). Override from Admin → platform marketing JSON. */
  nav_links: NavLinkConfig[];
  search_placeholder: string;
  primary_cta: { label: string; href: string };
  /** Shown under search on desktop (e.g. locale · currency); leave empty to hide. */
  locale_strip?: string;
  mobile_search_subtitle?: string;
};

export type ContactSettings = {
  support_email: string;
  info_email: string;
  social_x: string;
  social_youtube: string;
  social_instagram: string;
  social_tiktok: string;
  social_facebook?: string;
  social_linkedin?: string;
  social_whatsapp?: string;
  hq_line1: string;
  hq_line2: string;
};

export type DefaultsSettings = {
  currency: string;
  timezone: string;
  low_stock_threshold: number;
  allow_backorder: boolean;
  community_trial_days: number;
  community_platform_commission_rate: number;
  affiliate_silver_threshold: number;
  affiliate_gold_threshold: number;
  payout_method: string;
  exchange_rate_provider: string;
};

export type PlatformSecurityPolicies = {
  membership_reactivation_window_minutes: number;
  webhook_max_failure_count: number;
  digital_access_expiry_days: number | null;
};

/** Active checkout providers only. Retired providers — see retired-providers.ts. */
export type PaymentProviderId =
  | "flutterwave"
  | "nowpayments"
  | "binancepay";

export type PaymentProvidersSettings = {
  sandbox_mode: boolean;
  providers: Record<PaymentProviderId, { enabled: boolean }>;
};

export const DEFAULT_PAYMENT_PROVIDERS: PaymentProvidersSettings = {
  sandbox_mode: false,
  providers: {
    flutterwave: { enabled: true },
    nowpayments: { enabled: true },
    binancepay: { enabled: true },
  },
};

export const DEFAULT_PLATFORM_DEFAULTS: DefaultsSettings = {
  currency: "USD",
  timezone: "Africa/Kigali",
  low_stock_threshold: 5,
  allow_backorder: false,
  community_trial_days: 0,
  community_platform_commission_rate: 15,
  affiliate_silver_threshold: 500_000,
  affiliate_gold_threshold: 2_000_000,
  payout_method: "mtn",
  exchange_rate_provider: "openexchangerates",
};

export const DEFAULT_PLATFORM_SECURITY: PlatformSecurityPolicies = {
  membership_reactivation_window_minutes: 10,
  webhook_max_failure_count: 5,
  digital_access_expiry_days: null,
};

export function mergeDefaults(patch: Partial<DefaultsSettings>): DefaultsSettings {
  return { ...DEFAULT_PLATFORM_DEFAULTS, ...patch };
}

export function mergePlatformSecurity(patch: Partial<PlatformSecurityPolicies>): PlatformSecurityPolicies {
  return { ...DEFAULT_PLATFORM_SECURITY, ...patch };
}

export function mergePaymentProviders(patch: Partial<PaymentProvidersSettings>): PaymentProvidersSettings {
  const base = DEFAULT_PAYMENT_PROVIDERS;
  const providers = { ...base.providers };
  if (patch.providers && typeof patch.providers === "object") {
    for (const id of Object.keys(providers) as PaymentProviderId[]) {
      const p = patch.providers[id];
      if (p && typeof p.enabled === "boolean") {
        providers[id] = { enabled: p.enabled };
      }
    }
  }
  return {
    sandbox_mode: typeof patch.sandbox_mode === "boolean" ? patch.sandbox_mode : base.sandbox_mode,
    providers,
  };
}

export type ResolvedPlatformSettings = {
  fees: FeesSettings;
  social_proof: SocialProofSettings;
  marketing: MarketingSettings;
  contact: ContactSettings;
};

export const PLATFORM_SETTINGS_DEFAULTS: ResolvedPlatformSettings = {
  fees: {
    min_payout_rwf: 50,
    default_affiliate_commission_percent: 5,
    shopify_default_platform_commission_percent: 8,
    platform_fee_percent: 5,
    platform_fee_fixed_rwf: 0,
  },
  social_proof: {
    success_rate_display: "",
    countries_display: "",
    fallback_verified_vendors: "",
    fallback_total_products: "",
  },
  marketing: {
    trending_search_keywords: [],
    affiliate_value_props: [
      "Competitive affiliate rates",
      "Lifetime referral tracking",
      "Creator & affiliate tools",
    ],
    trust_bar: [
      { title: "Buyer Protection", desc: "Eligible orders reviewed by support" },
      { title: "Verified Sellers", desc: "Identity and business checks" },
      { title: "Global Logistics", desc: "Freight & fulfillment partners" },
      { title: "Secure Payouts", desc: "Multi-currency payout options" },
      { title: "Creator Network", desc: "Affiliates & influencers worldwide" },
    ],
    nav_links: [
      { label: "Marketplace", href: "/marketplace" },
      { label: "Communities", href: "/communities" },
      { label: "Commerce", href: "/commerce" },
      { label: "Affiliates", href: "/affiliates" },
      { label: "UGC & Clipping", href: "/ugc" },
    ],
    search_placeholder: "Search globally, sell everywhere…",
    primary_cta: { label: "Post buying lead", href: "/requests/new" },
    locale_strip: "EN · USD",
    mobile_search_subtitle: "Products, suppliers, and marketplace",
  },
  contact: {
    support_email: JIMVIO_SUPPORT_EMAIL,
    info_email: "info@jimvio.com",
    social_x: "https://x.com/Jimvio_Official",
    social_youtube: "https://youtube.com/@jimvio?si=V-gMmLi6YUr8xAhv",
    social_instagram: "https://www.instagram.com/jimvioofficial?dlrf=MW03Y2U4aGVpc3hsMw%3D%3D&utm_source=qr",
    social_tiktok: "https://www.tiktok.com/@jimvioofficial",
    social_facebook: "",
    social_linkedin: "https://www.linkedin.com/company/jimvio/",
    social_whatsapp: "",
    hq_line1: "",
    hq_line2: "",
  },
};

function mergeFees(patch: Partial<FeesSettings>): FeesSettings {
  return { ...PLATFORM_SETTINGS_DEFAULTS.fees, ...patch };
}

function mergeSocial(patch: Partial<SocialProofSettings>): SocialProofSettings {
  return { ...PLATFORM_SETTINGS_DEFAULTS.social_proof, ...patch };
}

function mergeMarketing(patch: Partial<MarketingSettings>): MarketingSettings {
  const base = PLATFORM_SETTINGS_DEFAULTS.marketing;
  const navLinks =
    Array.isArray(patch.nav_links) && patch.nav_links.length > 0
      ? patch.nav_links.filter((l) => l?.href && l?.label)
      : base.nav_links;
  const searchPlaceholder =
    typeof patch.search_placeholder === "string" && patch.search_placeholder.trim()
      ? patch.search_placeholder.trim()
      : base.search_placeholder;
  const primaryCta =
    patch.primary_cta?.label?.trim() && patch.primary_cta?.href?.trim()
      ? { label: patch.primary_cta.label.trim(), href: patch.primary_cta.href.trim() }
      : base.primary_cta;
  const localeStrip =
    typeof patch.locale_strip === "string" ? patch.locale_strip : base.locale_strip ?? "";
  const mobileSearchSubtitle =
    typeof patch.mobile_search_subtitle === "string" && patch.mobile_search_subtitle.trim()
      ? patch.mobile_search_subtitle.trim()
      : base.mobile_search_subtitle ?? "";
  return {
    trending_search_keywords: Array.isArray(patch.trending_search_keywords)
      ? patch.trending_search_keywords.filter((x) => typeof x === "string" && x.trim())
      : base.trending_search_keywords,
    affiliate_value_props:
      Array.isArray(patch.affiliate_value_props) && patch.affiliate_value_props.length > 0
        ? patch.affiliate_value_props
        : base.affiliate_value_props,
    trust_bar:
      Array.isArray(patch.trust_bar) && patch.trust_bar.length > 0 ? patch.trust_bar : base.trust_bar,
    nav_links: navLinks,
    search_placeholder: searchPlaceholder,
    primary_cta: primaryCta,
    locale_strip: localeStrip,
    mobile_search_subtitle: mobileSearchSubtitle,
  };
}

function mergeContact(patch: Partial<ContactSettings>): ContactSettings {
  return { ...PLATFORM_SETTINGS_DEFAULTS.contact, ...patch };
}

export function resolvePlatformSettingsFromRows(
  rows: { key: string; value: unknown }[] | null | undefined
): ResolvedPlatformSettings {
  const map = new Map<string, unknown>();
  for (const r of rows ?? []) {
    map.set(r.key, r.value);
  }
  const feesRaw = map.get("fees");
  const socialRaw = map.get("social_proof");
  const marketingRaw = map.get("marketing");
  const contactRaw = map.get("contact");

  return {
    fees: mergeFees(typeof feesRaw === "object" && feesRaw ? (feesRaw as FeesSettings) : {}),
    social_proof:
      mergeSocial(typeof socialRaw === "object" && socialRaw ? (socialRaw as SocialProofSettings) : {}),
    marketing: mergeMarketing(
      typeof marketingRaw === "object" && marketingRaw ? (marketingRaw as MarketingSettings) : {}
    ),
    contact: mergeContact(typeof contactRaw === "object" && contactRaw ? (contactRaw as ContactSettings) : {}),
  };
}

export function formatPlatformCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k+`;
  return n > 0 ? `${n}+` : "0";
}

export function socialProofBarValues(
  platformStats: { totalVendors: number; totalProducts: number },
  sp: SocialProofSettings
): {
  verifiedVendors: string;
  successRate: string;
  totalProducts: string;
  countries: string;
} {
  const verifiedVendors =
    platformStats.totalVendors >= 1000
      ? `${(platformStats.totalVendors / 1000).toFixed(1)}k+`
      : platformStats.totalVendors > 0
        ? `${platformStats.totalVendors}+`
        : "—";
  const totalProducts =
    platformStats.totalProducts >= 1000
      ? `${Math.round(platformStats.totalProducts / 1000)}k+`
      : platformStats.totalProducts > 0
        ? `${platformStats.totalProducts}+`
        : "—";
  return {
    verifiedVendors,
    successRate: sp.success_rate_display,
    totalProducts,
    countries: sp.countries_display,
  };
}
