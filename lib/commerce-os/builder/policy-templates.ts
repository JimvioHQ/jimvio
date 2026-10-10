/** Professional policy templates — clearly templates, not merchant-specific facts. */

import {
  defaultStorePageHtml,
  defaultStorePageTitle,
  type StorePageHandle,
} from "@/lib/commerce-os/storefront/page-content";

export const POLICY_TEMPLATES: Record<
  string,
  { title: string; bodyHtml: (storeName: string) => string }
> = {
  terms: {
    title: defaultStorePageTitle("terms"),
    bodyHtml: (n) => defaultStorePageHtml("terms", n),
  },
  privacy: {
    title: defaultStorePageTitle("privacy"),
    bodyHtml: (n) => defaultStorePageHtml("privacy", n),
  },
  "refund-policy": {
    title: defaultStorePageTitle("refund-policy"),
    bodyHtml: (n) => defaultStorePageHtml("refund-policy", n),
  },
  "shipping-policy": {
    title: defaultStorePageTitle("shipping-policy"),
    bodyHtml: (n) => defaultStorePageHtml("shipping-policy", n),
  },
  contact: {
    title: defaultStorePageTitle("contact"),
    bodyHtml: (n) => defaultStorePageHtml("contact", n),
  },
  about: {
    title: defaultStorePageTitle("about"),
    bodyHtml: (n) => defaultStorePageHtml("about", n),
  },
};

export type { StorePageHandle };
