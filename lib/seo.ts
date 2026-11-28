import { Metadata } from "next";
import { SEO_DESCRIPTION } from "@/lib/brand/positioning";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export const SITE = {
  name: "Jimvio",
  url: siteUrl,
  logo: `${siteUrl}/jimvio-logo.svg`,
  ogImage: `${siteUrl}/icons/icon-512.png`,
  twitter: "@Jimvio_Official",
  /** Brand-first title for Google site name & homepage SERP */
  title: "Jimvio",
  tagline: "All-in-one creator commerce and digital business platform",
  description: SEO_DESCRIPTION,
  keywords: [
    "Jimvio",
    "creator commerce",
    "digital business platform",
    "online marketplace",
    "dropshipping",
    "affiliate marketing",
    "UGC campaigns",
    "digital products",
    "creator communities",
    "live commerce",
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
      "Spaces for affiliates, sellers, and creators. Some are free, some charge a monthly fee. Find one that fits and join.",
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
    path: "/marketplace/flash-deals",
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
      "Jimvio is the all-in-one creator commerce and digital business platform for marketplace, affiliates, UGC, communities, and business tools.",
    path: "/about",
  },
  blog: {
    title: "Journal",
    description:
      "News, guides, and updates from Jimvio, the all-in-one creator commerce and digital business platform.",
    path: "/blog",
  },
  pricing: {
    title: "Pricing",
    description: "Free to join. See the platform fee on sales and the withdrawal fees Jimvio charges.",
    path: "/pricing",
  },
  protection: {
    title: "Buyer protection",
    description:
      "Eligible Jimvio orders that do not match the listing or do not arrive can be reviewed through support.",
    path: "/protection",
  },
  shipping: {
    title: "Global shipping",
    description:
      "Shipping on Jimvio is the information shown on the product and at checkout. Delivery dates are not guaranteed.",
    path: "/shipping",
  },
  guides: {
    title: "Trade guides",
    description:
      "Jimvio help articles for buying, selling, supplier fulfillment, and shipping.",
    path: "/guides",
  },
  docs: {
    title: "API docs",
    description:
      "Merchant API routes under /api/v1. Keys are not shown on this page.",
    path: "/docs",
  },
  updates: {
    title: "Platform updates",
    description:
      "Product announcements published in the Jimvio Journal, plus a link to system status.",
    path: "/updates",
  },
  monetization: {
    title: "Creator monetization",
    description:
      "Affiliate links, campaigns, and wallet tools creators can use on Jimvio. Income is not guaranteed.",
    path: "/monetization",
  },
  verified: {
    title: "What Verified means",
    description: "What the Verified badge on a Jimvio store covers, what it does not, and which stores carry it.",
    path: "/verified",
  },
  careers: {
    title: "Careers at Jimvio",
    description:
      "Join Jimvio’s remote-first team building the all-in-one creator commerce and digital business platform.",
    path: "/careers",
  },
  press: {
    title: "Press & Media",
    description:
      "Media resources for Jimvio — company overview, brand assets, and press contact for journalists and partners.",
    path: "/press",
  },
  contact: {
    title: "Contact Jimvio",
    description:
      "Contact Jimvio for support, partnerships, creator and vendor questions, press, and general inquiries.",
    path: "/contact",
  },
  legal: {
    title: "Legal Center",
    description:
      "Jimvio Legal Center — terms, privacy, cookies, seller and buyer policies, community guidelines, and more.",
    path: "/legal",
  },
  terms: {
    title: "Terms of service",
    description: "Terms and conditions for using Jimvio.",
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
    description: "Shop physical products on Jimvio. Shipping options and rates are shown for your region before you pay.",
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
  keywords,
}: SeoProps = {}): Metadata {
  const canonicalUrl = `${SITE.url}${path === "/" ? "" : path}`;
  // Pages without their own image get a real 1200×630 card with their title (N-9).
  const resolvedImage =
    image === SITE.ogImage
      ? `/og?title=${encodeURIComponent(title === SITE.title ? SITE.name : title)}&subtitle=${encodeURIComponent(truncateDescription(description, 120))}`
      : image;
  const absoluteImage = resolvedImage.startsWith("http") ? resolvedImage : `${SITE.url}${resolvedImage}`;
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
    // R-6: no site-wide keyword list; only pages that pass their own.
    ...(keywords?.length ? { keywords } : {}),
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
        { url: "/api/site-icons/favicon-ico", sizes: "16x16 32x32 48x48" },
        { url: "/api/site-icons/favicon-svg", type: "image/svg+xml" },
        { url: "/api/site-icons/favicon-16", sizes: "16x16", type: "image/png" },
        { url: "/api/site-icons/favicon-32", sizes: "32x32", type: "image/png" },
        { url: "/api/site-icons/favicon-48", sizes: "48x48", type: "image/png" },
        { url: "/api/site-icons/icon-24", sizes: "24x24", type: "image/png" },
        { url: "/api/site-icons/icon-64", sizes: "64x64", type: "image/png" },
        { url: "/api/site-icons/icon-72", sizes: "72x72", type: "image/png" },
        { url: "/api/site-icons/icon-96", sizes: "96x96", type: "image/png" },
        { url: "/api/site-icons/icon-128", sizes: "128x128", type: "image/png" },
        { url: "/api/site-icons/icon-144", sizes: "144x144", type: "image/png" },
        { url: "/api/site-icons/icon-256", sizes: "256x256", type: "image/png" },
        { url: "/api/site-icons/icon-180", sizes: "180x180", type: "image/png" },
        { url: "/api/site-icons/icon-1024", sizes: "1024x1024", type: "image/png" },
        { url: "/api/site-icons/pwa-192", sizes: "192x192", type: "image/png" },
        { url: "/api/site-icons/pwa-512", sizes: "512x512", type: "image/png" },
      ],
      shortcut: "/api/site-icons/favicon-ico",
      apple: [
        { url: "/api/site-icons/apple-touch", sizes: "180x180", type: "image/png" },
        { url: "/api/site-icons/apple-152", sizes: "152x152", type: "image/png" },
        { url: "/api/site-icons/apple-167", sizes: "167x167", type: "image/png" },
      ],
      other: [
        { rel: "mask-icon", url: "/api/site-icons/safari-pinned", color: "#F95405" },
        { rel: "msapplication-TileImage", url: "/api/site-icons/windows-tile" },
        { rel: "msapplication-config", url: "/browserconfig.xml" },
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
