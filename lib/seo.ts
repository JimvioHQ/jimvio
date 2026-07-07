import { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export const SITE = {
  name: "Jimvio",
  url: siteUrl,
  logo: `${siteUrl}/jimvio-logo.svg`,
  ogImage: `${siteUrl}/icons/icon-512.png`,
  twitter: "@jimvio",
  /** Brand-first title for Google site name & homepage SERP */
  title: "Jimvio",
  tagline: "Global creator commerce platform",
  description:
    "Jimvio is the global creator commerce platform to sell products, run affiliate programs, launch UGC campaigns, and grow your community — free to start.",
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
    title: "Jimvio — Global Creator Commerce Platform",
    description:
      "Sell products, run affiliate programs, launch UGC campaigns, and grow your creator community on one global commerce platform. Free to start on Jimvio.",
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
  blog: {
    title: "Journal",
    description: "News, guides, and updates from the Jimvio creator commerce platform.",
    path: "/blog",
  },
  contact: {
    title: "Contact",
    description: "Get in touch with the Jimvio team for support, partnerships, and press inquiries.",
    path: "/contact",
  },
  pricing: {
    title: "Pricing",
    description: "Transparent pricing for selling, affiliates, and UGC on Jimvio. Start free and scale as you grow.",
    path: "/pricing",
  },
  protection: {
    title: "Buyer protection",
    description: "How Jimvio protects buyers and sellers with secure checkout, dispute support, and verified vendors.",
    path: "/protection",
  },
  verified: {
    title: "Verified program",
    description: "Learn how Jimvio verifies vendors and creators to keep the marketplace trustworthy.",
    path: "/verified",
  },
  careers: {
    title: "Careers",
    description: "Join the Jimvio team and help build the global creator commerce platform.",
    path: "/careers",
  },
  terms: {
    title: "Terms of service",
    description: "Terms and conditions for using the Jimvio creator commerce platform.",
    path: "/terms",
  },
  privacy: {
    title: "Privacy policy",
    description: "How Jimvio collects, uses, and protects your personal data.",
    path: "/privacy",
  },
  cookies: {
    title: "Cookie policy",
    description: "How Jimvio uses cookies and similar technologies on the platform.",
    path: "/cookies",
  },
  content: {
    title: "Content policy",
    description: "Guidelines for content published on Jimvio marketplaces, communities, and campaigns.",
    path: "/content",
  },
  shorts: {
    title: "Short videos",
    description: "Watch shoppable short videos from top creators and discover trending products on Jimvio.",
    path: "/shorts",
  },
  marketplacePhysical: {
    title: "Physical products",
    description: "Shop physical products from verified suppliers on Jimvio with shipping options for your region.",
    path: "/marketplace/physical",
  },
  marketplaceDigital: {
    title: "Digital products",
    description: "Instant-download templates, courses, software, and digital goods on Jimvio.",
    path: "/marketplace/digital",
  },
  influencersBrowse: {
    title: "Browse creators",
    description: "Discover creators, influencers, and vendor storefronts on Jimvio.",
    path: "/influencers/browse",
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
  const isRootTitle = path === "" && title === SITE.title;

  return {
    title: isRootTitle
      ? {
          default: SITE.title,
          template: `%s | ${SITE.name}`,
        }
      : title,
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
        { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
        { url: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
        { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      other: [
        {
          rel: "mask-icon",
          url: "/icons/safari-pinned-tab.svg",
          color: "#FB4C07",
        },
      ],
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

/** Metadata for pages that must not be indexed (cart, checkout, 404, etc.). */
export function noIndexMetadata(
  title: string,
  description: string,
  path = "",
): Metadata {
  return constructMetadata({ title, description, path, noIndex: true });
}
