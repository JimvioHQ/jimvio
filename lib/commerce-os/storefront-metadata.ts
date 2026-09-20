import type { Metadata } from "next";
import { truncateDescription } from "@/lib/seo";
import { STOREFRONT_NEUTRAL_FAVICON_PATH } from "./storefront-icons";
import { storefrontDisplayHost, storefrontDisplayUrl } from "./storefront-url";
import type { StorefrontStore } from "./storefront/load";

type StorefrontSeoSource = Pick<
  StorefrontStore,
  "name" | "handle" | "description" | "logo_url" | "favicon_url" | "seo"
>;

function seoString(seo: Record<string, unknown>, key: string): string | null {
  const value = seo[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function seoKeywords(seo: Record<string, unknown>, storeName: string): string[] {
  const raw = seo.keywords;
  if (Array.isArray(raw)) {
    const cleaned = raw
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
    if (cleaned.length) return cleaned;
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  // Store-local keywords only — never inherit Jimvio platform keywords.
  return [storeName, `${storeName} store`, "online store", "shop"];
}

/** Always set icons so Next.js never inherits the platform Jimvio favicon.
 * Merchant favicon only when explicitly uploaded — never fall back to logo
 * or Jimvio branding (neutral empty icon otherwise). */
export function resolveStorefrontIcons(store: {
  favicon_url?: string | null;
  logo_url?: string | null;
}): NonNullable<Metadata["icons"]> {
  const dedicated =
    typeof store.favicon_url === "string" && store.favicon_url.trim()
      ? store.favicon_url.trim()
      : null;
  const url = dedicated || STOREFRONT_NEUTRAL_FAVICON_PATH;
  return {
    icon: [{ url, ...(url.endsWith(".svg") ? { type: "image/svg+xml" } : {}) }],
    shortcut: url,
    apple: [{ url }],
  };
}

/**
 * Complete merchant-storefront Metadata that overrides root platform defaults
 * (Twitter, keywords, applicationName, authors, appleWebApp, etc.).
 * Canonical/OG/Twitter URLs always use `{handle}.jimvio.com`.
 */
export function buildStorefrontMetadata(
  store: StorefrontSeoSource,
  options?: {
    path?: string;
    title?: string;
    description?: string;
    image?: string | null;
    /** Theme draft/published logo when `logo_url` column is empty. */
    themeLogoUrl?: string | null;
  }
): Metadata {
  const path = options?.path || "";
  const canonical = storefrontDisplayUrl(store.handle, path);
  const host = storefrontDisplayHost(store.handle);
  const logoForBrand =
    (typeof store.logo_url === "string" && store.logo_url.trim()
      ? store.logo_url.trim()
      : null) ||
    (typeof options?.themeLogoUrl === "string" && options.themeLogoUrl.trim()
      ? options.themeLogoUrl.trim()
      : null);
  const title =
    options?.title ||
    seoString(store.seo, "title") ||
    store.name;
  const rawDescription =
    options?.description ||
    seoString(store.seo, "description") ||
    store.description ||
    `Shop ${store.name}`;
  const description = truncateDescription(rawDescription);
  const image =
    options?.image ||
    logoForBrand ||
    seoString(store.seo, "image") ||
    null;
  const keywords = seoKeywords(store.seo, store.name);
  const iconSource = {
    favicon_url: store.favicon_url,
    logo_url: logoForBrand,
  };

  return {
    // Absolute title prevents root template `%s | Jimvio`.
    title: { absolute: title },
    description,
    applicationName: store.name,
    keywords,
    authors: [{ name: store.name, url: canonical }],
    creator: store.name,
    publisher: store.name,
    category: "shopping",
    metadataBase: new URL(`https://${host}`),
    alternates: { canonical },
    // Explicit null clears the root Jimvio PWA manifest (undefined would inherit).
    manifest: null,
    icons: resolveStorefrontIcons(iconSource),
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: store.name,
      type: "website",
      locale: "en_US",
      images: image
        ? [{ url: image, width: 1200, height: 630, alt: title }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      // Override root @jimvio handles with store identity (no platform handle).
      site: store.name,
      creator: store.name,
      images: image ? [image] : [],
    },
    appleWebApp: {
      capable: true,
      title: store.name,
      statusBarStyle: "default",
    },
    // Next Metadata has no first-class twitter:url — emit explicitly.
    other: {
      "twitter:url": canonical,
    },
  };
}

/** Minimal fallback when the store handle does not resolve. */
export function buildMissingStorefrontMetadata(): Metadata {
  return {
    title: { absolute: "Store not found" },
    description: "This storefront is unavailable.",
    robots: { index: false, follow: false },
    keywords: [],
    applicationName: "Store",
    manifest: null,
    icons: resolveStorefrontIcons({ favicon_url: null, logo_url: null }),
    openGraph: {
      title: "Store not found",
      description: "This storefront is unavailable.",
    },
    twitter: {
      card: "summary",
      title: "Store not found",
      description: "This storefront is unavailable.",
      site: "Store",
      creator: "Store",
    },
  };
}
