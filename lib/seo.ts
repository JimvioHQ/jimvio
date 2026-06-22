import { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export const SITE = {
  name: "Jimvio",
  url: siteUrl,
  logo: `${siteUrl}/jimvio-logo.svg`,
  ogImage: `${siteUrl}/jimvio-og.png`,
  twitter: "@jimvio",
  /** Brand-first title for Google site name & homepage SERP */
  title: "Jimvio",
  tagline: "Marketplace, affiliates, UGC & communities",
  description:
    "Jimvio is the creator marketplace to sell products, share affiliate links, take UGC jobs, and run your community — free to start.",
  keywords: [
    "Jimvio",
    "Jimvio marketplace",
    "creator marketplace",
    "affiliate program",
    "UGC campaigns",
    "sell online",
    "creator community",
  ],
} as const;

export const PAGE_SEO = {
  home: {
    title: SITE.title,
    description: SITE.description,
    path: "/",
  },
  marketplace: {
    title: "Marketplace",
    description:
      "Physical and digital products from suppliers on Jimvio. Filter by category, check shipping, and checkout when you're ready.",
    path: "/marketplace",
  },
  communities: {
    title: "Communities",
    description:
      "Groups for affiliates, sellers, and creators. Some are free, some charge a monthly fee. Find one that fits and join.",
    path: "/communities",
  },
  affiliates: {
    title: "Affiliate program",
    description:
      "Grab a link, share it, get paid when someone buys. Your dashboard shows clicks, sales, and what you've earned so far.",
    path: "/affiliates",
  },
  deals: {
    title: "Flash deals",
    description:
      "Products on sale right now. We refresh the list often, so check back if you don't see what you want.",
    path: "/deals",
  },
  ugc: {
    title: "UGC & clipping campaigns",
    description:
      "Paid brand briefs for creators. See budgets and rates before you apply.",
    path: "/ugc",
  },
  vendors: {
    title: "Suppliers & vendors",
    description:
      "Browse sellers on Jimvio. See what they list, where they ship, and their store ratings.",
    path: "/vendors",
  },
  help: {
    title: "Help center",
    description:
      "Guides for buying, selling, affiliates, and payouts on Jimvio.",
    path: "/help",
  },
  influencers: {
    title: "Creators",
    description:
      "Browse creator profiles and short clips. Useful if you're a brand looking for someone to work with.",
    path: "/influencers",
  },
  about: {
    title: "About Jimvio",
    description:
      "We got tired of jumping between apps to sell, promote, and get paid. Jimvio puts the main pieces in one spot.",
    path: "/about",
  },
} as const;

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  path?: string;
  type?: "website" | "article" | "product";
  noIndex?: boolean;
  keywords?: string[];
}

/** Trim meta descriptions to a Google-friendly length (~155 chars). */
export function truncateDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export function constructMetadata({
  title = SITE.title,
  description = SITE.description,
  image = SITE.ogImage,
  path = "",
  type = "website",
  noIndex = false,
  keywords = [...SITE.keywords],
}: SeoProps = {}): Metadata {
  const canonicalUrl = `${SITE.url}${path === "/" ? "" : path}`;
  const absoluteImage = image.startsWith("http") ? image : `${SITE.url}${image}`;
  const metaDescription = truncateDescription(description);

  const ogType: "website" | "article" = type === "article" ? "article" : "website";

  return {
    title: {
      default: SITE.title,
      template: `%s | ${SITE.name}`,
    },
    applicationName: SITE.name,
    description: metaDescription,
    keywords,
    metadataBase: new URL(SITE.url),
    authors: [{ name: SITE.name, url: SITE.url }],
    creator: SITE.name,
    publisher: SITE.name,
    category: "technology",
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: title === SITE.title ? SITE.name : title,
      description: metaDescription,
      url: canonicalUrl,
      siteName: SITE.name,
      images: [
        {
          url: absoluteImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: ogType,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: title === SITE.title ? SITE.name : title,
      description: metaDescription,
      images: [absoluteImage],
      creator: SITE.twitter,
      site: SITE.twitter,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      shortcut: "/favicon.svg",
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: SITE.name,
      statusBarStyle: "default",
    },
    verification: {
      google: "X3BENzfRf3Px2mMhw41lZgkOwJNs_BMpYSw2y_t6LO8",
    },
  };
}

export function pageMetadata(
  key: keyof typeof PAGE_SEO,
  overrides: Partial<SeoProps> = {},
): Metadata {
  const page = PAGE_SEO[key];
  return constructMetadata({
    title: page.title,
    description: page.description,
    path: page.path,
    ...overrides,
  });
}
