/**
 * Theme registry — settings + section templates.
 * Additive and backward-compatible with published storefronts.
 */

export type ButtonStyle = "filled" | "outline" | "ghost" | "soft" | "link";
export type LogoSize = "small" | "medium" | "large";
export type ShadowLevel = "none" | "subtle" | "medium" | "strong";
export type HeaderAlign = "left" | "centered";
export type FontScale = "sm" | "md" | "lg";
export type MobileNavStyle = "bottom" | "drawer" | "hidden";

export type ThemeSettings = {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor: string;
  surfaceColor?: string;
  textColor: string;
  mutedTextColor?: string;
  borderColor?: string;
  headerBackground?: string;
  announcementBackground?: string;
  announcementTextColor?: string;
  successColor?: string;
  warningColor?: string;
  errorColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonStyle?: ButtonStyle;
  buttonRadius?: string;
  buttonHeight?: string;
  fontFamily: string;
  headingFont?: string;
  fontScale?: FontScale;
  radius: string;
  cardRadius?: string;
  inputRadius?: string;
  productGridColumns?: 2 | 3 | 4 | 5 | 6;
  headerStyle?: "simple" | "centered";
  headerAlign?: HeaderAlign;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  logoSize?: LogoSize;
  stickyHeader?: boolean;
  showPoweredBy?: boolean;
  mobileNavStyle?: MobileNavStyle;
  maxWidth?: string;
  sectionSpacing?: string;
  shadow?: ShadowLevel;
  productImageRatio?: "1/1" | "4/3" | "3/4";
  /** Merchant PDP: sticky purchase bar on mobile. */
  productStickyAtc?: boolean;
  /** Merchant PDP: show parsed specifications grid when available. */
  productShowSpecs?: boolean;
  /** Merchant PDP: show related products rail. */
  productShowRelated?: boolean;
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
  | "new_arrivals"
  | "sale_rail"
  | "stats"
  | "gallery"
  | "video"
  | "contact_block"
  | "discount_banner"
  | "trust_shipping";

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
  headerBackground: "#FFFFFF",
  announcementBackground: "#0F172A",
  announcementTextColor: "#F8FAFC",
  successColor: "#059669",
  warningColor: "#D97706",
  errorColor: "#DC2626",
  buttonColor: "#FF5A1F",
  buttonTextColor: "#FFFFFF",
  buttonStyle: "filled",
  buttonRadius: "9999px",
  buttonHeight: "44px",
  fontFamily: "DM Sans",
  headingFont: "DM Sans",
  fontScale: "md",
  radius: "12px",
  cardRadius: "16px",
  inputRadius: "9999px",
  productGridColumns: 5,
  headerStyle: "simple",
  headerAlign: "left",
  logoSize: "medium",
  stickyHeader: true,
  showPoweredBy: false,
  mobileNavStyle: "bottom",
  maxWidth: "80rem",
  sectionSpacing: "3.5rem",
  shadow: "subtle",
  productImageRatio: "1/1",
  productStickyAtc: true,
  productShowSpecs: true,
  productShowRelated: true,
};

/** Hero layout/content presets — preserve compatible fields when applied. */
export const HERO_PRESETS: Record<
  string,
  { label: string; props: Record<string, unknown> }
> = {
  minimal: {
    label: "Minimal",
    props: {
      layout: "center",
      overlay: "0",
      height: "md",
      eyebrow: "",
      headline: "Discover something better",
      subhead: "Browse the latest from this store.",
      cta: "Shop now",
      ctaHref: "/collections/all",
    },
  },
  editorial: {
    label: "Editorial",
    props: {
      layout: "left",
      overlay: "0.25",
      height: "lg",
      eyebrow: "New season",
      headline: "Crafted for everyday",
      subhead: "Elevated essentials for modern life.",
      cta: "Explore collection",
      ctaHref: "/collections/all",
    },
  },
  split: {
    label: "Split",
    props: {
      layout: "split",
      overlay: "0",
      height: "lg",
      eyebrow: "Featured",
      headline: "Shop the edit",
      subhead: "Hand-picked pieces from this collection.",
      cta: "Shop now",
      ctaHref: "/collections/all",
      ctaSecondary: "Learn more",
      ctaSecondaryHref: "/pages/about",
    },
  },
  bold: {
    label: "Bold",
    props: {
      layout: "center",
      overlay: "0.35",
      height: "xl",
      eyebrow: "Limited",
      headline: "Make it yours",
      subhead: "Bold styles. Fast fulfillment.",
      cta: "Buy now",
      ctaHref: "/collections/all",
    },
  },
  promotional: {
    label: "Promotional",
    props: {
      layout: "center",
      overlay: "0.2",
      height: "md",
      eyebrow: "Sale",
      headline: "Up to 30% off",
      subhead: "Selected items for a limited time.",
      cta: "Shop deals",
      ctaHref: "/collections/all",
    },
  },
};

export type DesignPresetId =
  | "minimal"
  | "modern"
  | "luxury"
  | "fashion"
  | "creator"
  | "general";

export const DESIGN_PRESETS: Record<
  DesignPresetId,
  { label: string; description: string; settings: Partial<ThemeSettings> }
> = {
  minimal: {
    label: "Minimal",
    description: "Clean whitespace, soft neutrals",
    settings: {
      primaryColor: "#111827",
      secondaryColor: "#374151",
      accentColor: "#111827",
      backgroundColor: "#FFFFFF",
      surfaceColor: "#F9FAFB",
      textColor: "#111827",
      mutedTextColor: "#6B7280",
      buttonColor: "#111827",
      buttonTextColor: "#FFFFFF",
      buttonStyle: "filled",
      buttonRadius: "8px",
      radius: "8px",
      shadow: "none",
      productGridColumns: 3,
    },
  },
  modern: {
    label: "Modern Commerce",
    description: "Jimvio-ready orange energy",
    settings: {
      primaryColor: "#FF5A1F",
      secondaryColor: "#0F172A",
      accentColor: "#FF5A1F",
      backgroundColor: "#F8FAFC",
      surfaceColor: "#FFFFFF",
      textColor: "#111827",
      buttonColor: "#FF5A1F",
      buttonTextColor: "#FFFFFF",
      buttonStyle: "filled",
      buttonRadius: "9999px",
      radius: "12px",
      shadow: "subtle",
      productGridColumns: 3,
    },
  },
  luxury: {
    label: "Luxury",
    description: "Dark surfaces, gold accent",
    settings: {
      primaryColor: "#C6A75E",
      secondaryColor: "#F5F5F4",
      accentColor: "#C6A75E",
      backgroundColor: "#0C0A09",
      surfaceColor: "#1C1917",
      textColor: "#FAFAF9",
      mutedTextColor: "#A8A29E",
      borderColor: "rgba(255,255,255,0.12)",
      buttonColor: "#C6A75E",
      buttonTextColor: "#0C0A09",
      buttonStyle: "filled",
      buttonRadius: "4px",
      radius: "4px",
      shadow: "medium",
      productGridColumns: 3,
    },
  },
  fashion: {
    label: "Fashion",
    description: "Editorial pink and soft cream",
    settings: {
      primaryColor: "#BE185D",
      secondaryColor: "#831843",
      accentColor: "#F472B6",
      backgroundColor: "#FFF7ED",
      surfaceColor: "#FFFFFF",
      textColor: "#1F2937",
      buttonColor: "#BE185D",
      buttonTextColor: "#FFFFFF",
      buttonStyle: "filled",
      buttonRadius: "9999px",
      radius: "16px",
      productGridColumns: 4,
    },
  },
  creator: {
    label: "Creator Brand",
    description: "High contrast creator store",
    settings: {
      primaryColor: "#2563EB",
      secondaryColor: "#0F172A",
      accentColor: "#38BDF8",
      backgroundColor: "#F8FAFC",
      surfaceColor: "#FFFFFF",
      textColor: "#0F172A",
      buttonColor: "#2563EB",
      buttonTextColor: "#FFFFFF",
      buttonStyle: "filled",
      buttonRadius: "12px",
      radius: "12px",
      productGridColumns: 3,
    },
  },
  general: {
    label: "General Store",
    description: "Balanced retail defaults",
    settings: {
      primaryColor: "#0EA5E9",
      secondaryColor: "#0F172A",
      accentColor: "#F97316",
      backgroundColor: "#F8FAFC",
      surfaceColor: "#FFFFFF",
      textColor: "#111827",
      buttonColor: "#0EA5E9",
      buttonTextColor: "#FFFFFF",
      buttonStyle: "filled",
      buttonRadius: "10px",
      radius: "10px",
      productGridColumns: 3,
    },
  },
};

/** Sections merchants can add from the builder catalog. */
export const BUILDER_SECTION_CATALOG: Array<{
  type: SectionType;
  label: string;
  description: string;
  group: "core" | "commerce" | "trust" | "content";
  defaultProps?: Record<string, unknown>;
}> = [
  {
    type: "announcement",
    label: "Announcement bar",
    description: "Top promo strip",
    group: "core",
    defaultProps: { text: "" },
  },
  {
    type: "header",
    label: "Header",
    description: "Logo + navigation",
    group: "core",
  },
  {
    type: "hero",
    label: "Hero",
    description: "Headline, CTA, media",
    group: "core",
    defaultProps: {
      eyebrow: "",
      headline: "Discover something better",
      subhead: "Browse the latest from this store.",
      cta: "Shop now",
      ctaHref: "/collections/all",
      layout: "left",
      height: "lg",
      overlay: "0",
    },
  },
  {
    type: "featured_products",
    label: "Featured products",
    description: "Product grid",
    group: "commerce",
    defaultProps: { title: "Featured", layout: "grid" },
  },
  {
    type: "best_sellers",
    label: "Best sellers",
    description: "Highlight top products",
    group: "commerce",
    defaultProps: { title: "Best sellers", layout: "grid" },
  },
  {
    type: "new_arrivals",
    label: "New arrivals",
    description: "Latest products",
    group: "commerce",
    defaultProps: { title: "New arrivals", layout: "grid" },
  },
  {
    type: "sale_rail",
    label: "On sale",
    description: "Products with a real compare-at price",
    group: "commerce",
    defaultProps: { title: "On sale", limit: 8 },
  },
  {
    type: "collections",
    label: "Collections",
    description: "Category tiles from published store collections",
    group: "commerce",
    defaultProps: { title: "Shop by category" },
  },
  {
    type: "discount_banner",
    label: "Discount banner",
    description: "Promo strip with CTA",
    group: "commerce",
    defaultProps: {
      headline: "Limited-time offer",
      subhead: "Save on selected items",
      cta: "Shop now",
      ctaHref: "/collections/all",
    },
  },
  {
    type: "banner",
    label: "Trust / benefits",
    description: "Credibility strip",
    group: "trust",
    defaultProps: {
      headline: "",
      subhead: "",
    },
  },
  {
    type: "trust_shipping",
    label: "Shipping & returns",
    description: "Trust row for fulfillment",
    group: "trust",
    defaultProps: {
      headline: "",
      items: "",
    },
  },
  {
    type: "stats",
    label: "Stats",
    description: "Social-proof numbers",
    group: "trust",
    defaultProps: {
      aLabel: "",
      aValue: "",
      bLabel: "",
      bValue: "",
      cLabel: "",
      cValue: "",
    },
  },
  {
    type: "image_text",
    label: "Image + text",
    description: "Story block",
    group: "content",
    defaultProps: {
      headline: "Our story",
      body: "Built for customers who care about quality.",
      cta: "Learn more",
      ctaHref: "/pages/about",
      imagePosition: "left",
    },
  },
  {
    type: "gallery",
    label: "Image gallery",
    description: "Visual mood board",
    group: "content",
    defaultProps: { title: "Gallery" },
  },
  {
    type: "video",
    label: "Video",
    description: "Embed or hosted clip",
    group: "content",
    defaultProps: {
      title: "Watch the story",
      url: "",
    },
  },
  {
    type: "testimonials",
    label: "Testimonials",
    description: "Social proof",
    group: "trust",
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
    group: "content",
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
    description: "Subscriber capture (not campaign sending)",
    group: "content",
    defaultProps: {
      title: "Stay in the loop",
      subhead: "New drops and exclusive offers.",
      cta: "Notify me",
    },
  },
  {
    type: "contact_block",
    label: "Contact",
    description: "Store contact details",
    group: "content",
    defaultProps: {
      title: "Get in touch",
      body: "Questions about an order? We are here to help.",
    },
  },
  {
    type: "rich_text",
    label: "Rich text",
    description: "Custom HTML copy",
    group: "content",
    defaultProps: {
      html: "<p>Tell your brand story.</p>",
    },
  },
  {
    type: "footer",
    label: "Footer",
    description: "Links + powered by Jimvio",
    group: "core",
  },
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

export function applyDesignPreset(
  current: ThemeSettings,
  presetId: DesignPresetId
): ThemeSettings {
  const preset = DESIGN_PRESETS[presetId];
  if (!preset) return current;
  return mergeThemeSettings(current, preset.settings);
}

export function applyHeroPreset(
  props: Record<string, unknown> | undefined,
  presetKey: string
): Record<string, unknown> {
  const preset = HERO_PRESETS[presetKey];
  if (!preset) return { ...(props || {}) };
  // Preserve media fields when switching presets.
  const keep = {
    imageUrl: props?.imageUrl,
    mobileImageUrl: props?.mobileImageUrl,
    videoUrl: props?.videoUrl,
  };
  return {
    ...preset.props,
    ...Object.fromEntries(
      Object.entries(keep).filter(([, v]) => typeof v === "string" && v)
    ),
  };
}

export function defaultHomeSections(storeName: string): ThemeSection[] {
  return [
    {
      id: "announcement",
      type: "announcement",
      enabled: true,
      props: {
        text: "",
      },
    },
    { id: "header", type: "header", enabled: true },
    {
      id: "hero",
      type: "hero",
      enabled: true,
      props: {
        eyebrow: "",
        headline: storeName,
        subhead: `Shop ${storeName}`,
        cta: "Shop now",
        ctaHref: "/collections/all",
        ctaSecondary: "Browse all products",
        ctaSecondaryHref: "/collections/all",
        layout: "left",
        height: "lg",
      },
    },
    {
      id: "collections",
      type: "collections",
      enabled: true,
      props: { title: "Shop by category", layout: "icons" },
    },
    {
      id: "sale_rail",
      type: "sale_rail",
      enabled: true,
      props: { title: "On sale", limit: 8 },
    },
    {
      id: "featured_products",
      type: "featured_products",
      enabled: true,
      props: { title: "Featured products", layout: "grid", limit: 8 },
    },
    {
      id: "trust",
      type: "banner",
      enabled: false,
      props: {
        headline: "",
        subhead: "",
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

export function duplicateSection(section: ThemeSection): ThemeSection {
  return {
    ...section,
    id: `${section.type}-${Math.random().toString(36).slice(2, 8)}`,
    props: { ...(section.props || {}) },
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

const SHADOW_MAP: Record<ShadowLevel, string> = {
  none: "none",
  subtle: "0 1px 2px rgba(15,23,42,0.04)",
  medium: "0 8px 24px rgba(15,23,42,0.08)",
  strong: "0 20px 50px rgba(15,23,42,0.14)",
};

/** CSS variables applied to the live storefront shell. */
export function themeSettingsToCssVars(
  settings: ThemeSettings
): Record<string, string> {
  const s = mergeThemeSettings(settings, null);
  const logoPx =
    s.logoSize === "small" ? "28px" : s.logoSize === "large" ? "48px" : "36px";
  const fontScale =
    s.fontScale === "sm" ? "0.95" : s.fontScale === "lg" ? "1.06" : "1";
  return {
    "--store-primary": s.primaryColor,
    "--store-secondary": s.secondaryColor || s.primaryColor,
    "--store-accent": s.accentColor || s.primaryColor,
    "--store-bg": s.backgroundColor,
    "--store-surface": s.surfaceColor || "#FFFFFF",
    "--store-text": s.textColor,
    "--store-muted": s.mutedTextColor || "#6B7280",
    "--store-border": s.borderColor || "rgba(0,0,0,0.08)",
    "--store-header-bg": s.headerBackground || s.surfaceColor || "#FFFFFF",
    "--store-announce-bg": s.announcementBackground || "#0F172A",
    "--store-announce-text": s.announcementTextColor || "#F8FAFC",
    "--store-input-radius": s.inputRadius || "9999px",
    "--store-font-scale": fontScale,
    "--store-success": s.successColor || "#059669",
    "--store-warning": s.warningColor || "#D97706",
    "--store-error": s.errorColor || "#DC2626",
    "--store-btn": s.buttonColor || s.primaryColor,
    "--store-btn-text": s.buttonTextColor || "#FFFFFF",
    "--store-btn-radius": s.buttonRadius || "9999px",
    "--store-btn-height": s.buttonHeight || "44px",
    "--store-radius": s.radius,
    "--store-card-radius": s.cardRadius || s.radius,
    "--store-grid-cols": String(s.productGridColumns || 5),
    "--store-card-gap": "0.75rem",
    "--store-logo-size": logoPx,
    "--store-max-width": s.maxWidth || "80rem",
    "--store-section-space": s.sectionSpacing || "3.5rem",
    "--store-shadow": SHADOW_MAP[s.shadow || "subtle"],
    "--store-heading-font": s.headingFont
      ? `${s.headingFont}, ${s.fontFamily}, system-ui, sans-serif`
      : `${s.fontFamily}, system-ui, sans-serif`,
    "--store-image-ratio":
      s.productImageRatio === "4/3"
        ? "4 / 3"
        : s.productImageRatio === "3/4"
          ? "3 / 4"
          : "1 / 1",
  };
}

/** Lightweight local copy assist — no external AI provider required. */
export function suggestHeadline(input: string, storeName: string): string {
  const base = (input || storeName || "Your store").trim();
  if (!base) return "Discover something better";
  if (base.length < 18) return `Discover ${base}`;
  return base.replace(/\s+/g, " ").slice(0, 64);
}

export function suggestSeoDescription(
  storeName: string,
  description?: string | null
): string {
  const d = (description || "").trim();
  if (d.length >= 80) return d.slice(0, 155);
  return `Shop ${storeName} — secure checkout, curated products, and fast fulfillment.`.slice(
    0,
    155
  );
}

export function contrastWarning(
  bg: string,
  fg: string
): string | null {
  const parse = (hex: string): [number, number, number] | null => {
    const m = hex.replace("#", "").trim();
    if (m.length !== 6) return null;
    const n = Number.parseInt(m, 16);
    if (Number.isNaN(n)) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const a = parse(bg);
  const b = parse(fg);
  if (!a || !b) return null;
  const lum = (c: [number, number, number]) => {
    const s = c.map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * s[0]! + 0.7152 * s[1]! + 0.0722 * s[2]!;
  };
  const L1 = lum(a);
  const L2 = lum(b);
  const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  if (ratio < 3) return "Low contrast — text may be hard to read.";
  return null;
}
