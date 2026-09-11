/**
 * Theme registry — settings + section templates.
 * New themes are added here / in jimvio_themes without rewriting storefront logic.
 */

export type ThemeSettings = {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  radius: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
};

export type SectionType =
  | "announcement"
  | "header"
  | "hero"
  | "featured_products"
  | "collections"
  | "testimonials"
  | "faq"
  | "newsletter"
  | "footer"
  | "product_detail"
  | "collection_grid"
  | "cart"
  | "rich_text"
  | "banner";

export type ThemeSection = {
  id: string;
  type: SectionType;
  enabled: boolean;
  props?: Record<string, unknown>;
};

export type ThemeDraft = {
  settings: ThemeSettings;
  sections: {
    home: ThemeSection[];
    product?: ThemeSection[];
    collection?: ThemeSection[];
    cart?: ThemeSection[];
  };
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  primaryColor: "#FF5A1F",
  backgroundColor: "#F8FAFC",
  textColor: "#111827",
  fontFamily: "DM Sans",
  radius: "12px",
};

export function mergeThemeSettings(
  base: Partial<ThemeSettings> | null | undefined,
  patch: Partial<ThemeSettings> | null | undefined
): ThemeSettings {
  return {
    ...DEFAULT_THEME_SETTINGS,
    ...(base || {}),
    ...(patch || {}),
  };
}

export function defaultHomeSections(storeName: string): ThemeSection[] {
  return [
    {
      id: "announcement",
      type: "announcement",
      enabled: true,
      props: { text: "Free shipping on select orders · Secure Jimvio checkout" },
    },
    { id: "header", type: "header", enabled: true },
    {
      id: "hero",
      type: "hero",
      enabled: true,
      props: {
        headline: storeName,
        subhead: "Curated products. Fast checkout. Global fulfillment.",
        cta: "Shop the collection",
      },
    },
    { id: "featured_products", type: "featured_products", enabled: true, props: { title: "Featured" } },
    {
      id: "trust",
      type: "banner",
      enabled: true,
      props: {
        headline: "Why shop with us",
        subhead: "Secure checkout · Verified sourcing · Order tracking",
      },
    },
    { id: "footer", type: "footer", enabled: true },
  ];
}

export function reorderSections(
  sections: ThemeSection[],
  fromIndex: number,
  toIndex: number
): ThemeSection[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= sections.length ||
    toIndex >= sections.length ||
    fromIndex === toIndex
  ) {
    return sections;
  }
  const next = [...sections];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return sections;
  next.splice(toIndex, 0, item);
  return next;
}
