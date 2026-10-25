import { LEGAL_DOCUMENTS } from "@/lib/legal/catalog";
import { PAGE_SEO } from "@/lib/seo";
import { PUBLIC_SITEMAP_ROUTES } from "./public-surface";
import type { SeoPage } from "./types";

/**
 * Live titles that differ from the legal catalog on the same path.
 * Copied from the route metadata. This catalog does not change those routes.
 */
const PUBLISHED_ROUTE_COPY: Record<string, { title: string; description: string }> = {
  "/community-guidelines": {
    title: "Community Guidelines",
    description: "Jimvio community standards, prohibited behavior, and enforcement levels.",
  },
  "/prohibited-products": {
    title: "Prohibited Products & Services",
    description: "Products and services that are not allowed on the Jimvio marketplace and campaigns.",
  },
  "/refunds-payouts": {
    title: "Refunds & Disputes",
    description: "Jimvio refund windows, seller and creator payout rules, and chargeback handling.",
  },
};

/**
 * Pages the growth audit compares with the static sitemap.
 * PAGE_SEO remains the source for routes that already use it.
 * /help/contact is a real public page. Its live head still comes from the Help layout.
 */
export function growthCatalogPages(): SeoPage[] {
  const pages = new Map<string, SeoPage>();
  for (const page of Object.values(PAGE_SEO)) {
    pages.set(page.path, {
      path: page.path,
      title: page.title,
      description: page.description,
      canonical: page.path,
    });
  }

  const sitemap = new Set<string>(PUBLIC_SITEMAP_ROUTES.map((route) => route.path));
  for (const doc of LEGAL_DOCUMENTS) {
    if (!sitemap.has(doc.href) || pages.has(doc.href)) continue;
    const published = PUBLISHED_ROUTE_COPY[doc.href];
    pages.set(doc.href, {
      path: doc.href,
      title: published?.title ?? doc.title,
      description: published?.description ?? doc.description,
      canonical: doc.href,
    });
  }

  if (sitemap.has("/help/contact") && !pages.has("/help/contact")) {
    pages.set("/help/contact", {
      path: "/help/contact",
      title: PAGE_SEO.contact.title,
      description: PAGE_SEO.contact.description,
      canonical: "/help/contact",
    });
  }

  return [...pages.values()];
}
