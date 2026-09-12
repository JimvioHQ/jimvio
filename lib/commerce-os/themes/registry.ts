/**
 * Theme registry — settings + section templates.
 * New themes are added here / in jimvio_themes without rewriting storefront logic.
 */

export type ButtonStyle = "filled" | "outline" | "ghost";

export type ThemeSettings = {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor: string;
  surfaceColor?: string;
  textColor: string;
  mutedTextColor?: string;
  borderColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonStyle?: ButtonStyle;
  buttonRadius?: string;
  fontFamily: string;
  radius: string;
  productGridColumns?: 2 | 3 | 4;
  headerStyle?: "simple" | "centered";
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
  | "banner"
  | "image_text"
  | "best_sellers"
  | "new_arrivals";

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
  secondaryColor: "#0F172A",
  accentColor: "#FF5A1F",
  backgroundColor: "#F8FAFC",
  surfaceColor: "#FFFFFF",
  textColor: "#111827",
  mutedTextColor: "#6B7280",
  borderColor: "rgba(0,0,0,0.08)",
  buttonColor: "#FF5A1F",
  buttonTextColor: "#FFFFFF",
  buttonStyle: "filled",
  buttonRadius: "9999px",
  fontFamily: "DM Sans",
  radius: "12px",
  productGridColumns: 3,
  headerStyle: "simple",
};

/** Sections merchants can add from the builder catalog. */
export const BUILDER_SECTION_CATALOG: Array<{
  type: SectionType;
  label: string;
  description: string;
  defaultProps?: Record<string, unknown>;
}> = [
  {
    type: "announcement",
    label: "Announcement bar",
    description: "Top promo strip",
    defaultProps: { text: "Free shipping on select orders" },
  },
  { type: "header", label: "Header", description: "Logo + navigation" },
  {
    type: "hero",
    label: "Hero",
    description: "Headline, CTA, atmosphere",
    defaultProps: {
      headline: "Discover something better",
      subhead: "Curated products. Secure checkout.",
      cta: "Shop now",
      ctaHref: "/collections/all",
    },
  },
  {
    type: "featured_products",
    label: "Featured products",
    description: "Product grid",
    defaultProps: { title: "Featured" },
  },
  {
    type: "best_sellers",
    label: "Best sellers",
    description: "Highlight top products",
    defaultProps: { title: "Best sellers" },
  },
  {
    type: "new_arrivals",
    label: "New arrivals",
    description: "Latest products",
    defaultProps: { title: "New arrivals" },
  },
  {
    type: "collections",
    label: "Collections",
    description: "Featured collections teaser",
    defaultProps: { title: "Shop collections" },
  },
  {
    type: "banner",
    label: "Trust / promo banner",
    description: "Credibility strip",
    defaultProps: {
      headline: "Why shop with us",
      subhead: "Secure checkout · Verified sourcing · Order tracking",
    },
  },
  {
    type: "image_text",
    label: "Image + text",
    description: "Story block",
    defaultProps: {
      headline: "Our story",
      body: "Built for customers who care about quality.",
      cta: "Learn more",
      ctaHref: "/pages/about",
    },
  },
  {
    type: "testimonials",
    label: "Testimonials",
    description: "Social proof",
    defaultProps: {
      title: "What customers say",
      quote: "Fast shipping and great quality.",
      author: "Happy customer",
    },
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Common questions",
    defaultProps: {
      title: "FAQ",
      q1: "How long does shipping take?",
      a1: "Most orders ship within a few business days.",
      q2: "Can I return items?",
      a2: "See our refund policy for details.",
    },
  },
  {
    type: "newsletter",
    label: "Email capture",
    description: "Simple signup CTA",
    defaultProps: {
      title: "Stay in the loop",
      subhead: "New drops and exclusive offers.",
      cta: "Notify me",
    },
  },
  { type: "footer", label: "Footer", description: "Links + powered by Jimvio" },
];

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
      props: { text: "Free shipping on select orders · Secure checkout" },
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
        ctaHref: "/collections/all",
      },
    },
    {
      id: "featured_products",
      type: "featured_products",
      enabled: true,
      props: { title: "Featured" },
    },
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

export function createCatalogSection(
  type: SectionType,
  storeName: string
): ThemeSection {
  const catalog = BUILDER_SECTION_CATALOG.find((c) => c.type === type);
  const id = `${type}-${Math.random().toString(36).slice(2, 8)}`;
  const props = { ...(catalog?.defaultProps || {}) };
  if (type === "hero" && !props.headline) props.headline = storeName;
  return {
    id,
    type,
    enabled: true,
    props,
  };
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

/** CSS variables applied to the live storefront shell. */
export function themeSettingsToCssVars(
  settings: ThemeSettings
): Record<string, string> {
  const s = mergeThemeSettings(settings, null);
  return {
    "--store-primary": s.primaryColor,
    "--store-secondary": s.secondaryColor || s.primaryColor,
    "--store-accent": s.accentColor || s.primaryColor,
    "--store-bg": s.backgroundColor,
    "--store-surface": s.surfaceColor || "#FFFFFF",
    "--store-text": s.textColor,
    "--store-muted": s.mutedTextColor || "#6B7280",
    "--store-border": s.borderColor || "rgba(0,0,0,0.08)",
    "--store-btn": s.buttonColor || s.primaryColor,
    "--store-btn-text": s.buttonTextColor || "#FFFFFF",
    "--store-btn-radius": s.buttonRadius || "9999px",
    "--store-radius": s.radius,
    "--store-grid-cols": String(s.productGridColumns || 3),
  };
}
