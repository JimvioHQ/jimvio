/**
 * Default merchant storefront template.
 * Visual system matches the Provider Store storefront (header, announcement,
 * hero, featured products, footer). It never carries another merchant's name,
 * logo, products, or policies.
 */

import {
  DEFAULT_THEME_SETTINGS,
  DESIGN_PRESETS,
  applyDesignPreset,
  mergeThemeSettings,
  type DesignPresetId,
  type ThemeDraft,
  type ThemeSection,
  type ThemeSettings,
} from "./registry";

export const PROVIDER_STORE_TEMPLATE_ID = "provider";

export type StoreTemplateId = DesignPresetId | typeof PROVIDER_STORE_TEMPLATE_ID;

export type TemplateComposition =
  | "bar"
  | "hero"
  | "hero-center"
  | "hero-split"
  | "grid"
  | "rail"
  | "collections"
  | "note";

export type StoreTemplateCard = {
  id: StoreTemplateId;
  label: string;
  description: string;
  bestFor: string;
  settings: ThemeSettings;
  /** Short description of the homepage stack. Not a color name. */
  layoutLabel: string;
  composition: TemplateComposition[];
};

const BLOCKED_IDENTITY = /p7 provider/i;

export function providerStoreSettings(): ThemeSettings {
  return mergeThemeSettings(DEFAULT_THEME_SETTINGS, {
    headerStyle: "simple",
    headerAlign: "left",
    stickyHeader: true,
    productGridColumns: 5,
    buttonRadius: "9999px",
    shadow: "subtle",
    announcementBackground: "#0F172A",
    announcementTextColor: "#F8FAFC",
    headerBackground: "#FFFFFF",
  });
}

/** Homepage sections for a brand-new store. Copy uses that store's name only. */
export function providerStoreHomeSections(storeName: string): ThemeSection[] {
  return homeSectionsForTemplate(PROVIDER_STORE_TEMPLATE_ID, storeName);
}

/**
 * Homepage recipes for the existing template ids.
 * Copy is the store name only. No reviews, discounts, or delivery claims.
 */
export function homeSectionsForTemplate(templateId: string, storeName: string): ThemeSection[] {
  const name = sanitizeStoreLabel(storeName);
  switch (templateId) {
    case PROVIDER_STORE_TEMPLATE_ID:
      return [
        announcement(),
        header(),
        hero(name, "left", "lg"),
        products("featured_products", "featured_products", "Featured products", "grid", 8),
        footer(),
      ];
    case "minimal":
      return [
        header(),
        hero(name, "center", "md"),
        products("featured_products", "featured_products", "Featured products", "grid", 6),
        footer(),
      ];
    case "modern":
      return [
        announcement(),
        header(),
        hero(name, "left", "lg"),
        collections(),
        products("featured_products", "featured_products", "Featured products", "grid", 8),
        newsletter(name),
        footer(),
      ];
    case "fashion":
      return [
        header(),
        hero(name, "split", "xl"),
        products("new_arrivals", "new_arrivals", "New arrivals", "rail", 8),
        products("featured_products", "featured_products", "Featured products", "grid", 8),
        footer(),
      ];
    case "beauty":
      return [
        header(),
        hero(name, "center", "lg"),
        products("featured_products", "featured_products", "Featured products", "grid", 6),
        newsletter(name),
        footer(),
      ];
    case "electronics":
      return [
        announcement(),
        header(),
        hero(name, "left", "md"),
        products("featured_products", "featured_products", "Featured products", "grid", 8),
        products("best_sellers", "best_sellers", "Best sellers", "rail", 8),
        footer(),
      ];
    case "home":
      return [
        header(),
        hero(name, "split", "lg"),
        collections(),
        products("featured_products", "featured_products", "Featured products", "grid", 6),
        footer(),
      ];
    case "lifestyle":
      return [
        header(),
        hero(name, "center", "md"),
        collections(),
        products("new_arrivals", "new_arrivals", "New arrivals", "grid", 8),
        newsletter(name),
        footer(),
      ];
    case "premium":
      return [
        header(),
        hero(name, "center", "xl"),
        products("featured_products", "featured_products", "Featured products", "grid", 6),
        collections(),
        footer(),
      ];
    case "creator":
      return [
        header(),
        hero(name, "split", "lg"),
        products("featured_products", "featured_products", "Featured products", "rail", 8),
        newsletter(name),
        footer(),
      ];
    case "editorial":
      return [
        header(),
        hero(name, "left", "xl"),
        products("featured_products", "featured_products", "Featured products", "grid", 6),
        collections(),
        newsletter(name),
        footer(),
      ];
    default:
      return [];
  }
}

export function buildProviderStoreDraft(storeName: string): ThemeDraft {
  return {
    templateId: PROVIDER_STORE_TEMPLATE_ID,
    settings: providerStoreSettings(),
    sections: { home: providerStoreHomeSections(storeName) },
  };
}

export function listStoreTemplates(): StoreTemplateCard[] {
  const provider = templateCard(
    PROVIDER_STORE_TEMPLATE_ID,
    "Provider Store",
    "Announcement bar, left-aligned hero, and a featured product grid.",
    "New online stores",
    providerStoreSettings(),
  );
  const presets = (Object.keys(DESIGN_PRESETS) as DesignPresetId[]).map((id) => {
    const preset = DESIGN_PRESETS[id];
    return templateCard(
      id,
      preset.label,
      preset.description,
      preset.bestFor,
      mergeThemeSettings(providerStoreSettings(), preset.settings),
    );
  });
  return [provider, ...presets];
}

export function storeTemplateById(id: string | null | undefined): StoreTemplateCard | null {
  if (!id) return null;
  return listStoreTemplates().find((template) => template.id === id) ?? null;
}

export function applyStoreTemplate(opts: {
  storeName: string;
  templateId: string;
  current: ThemeDraft | null;
}): ThemeDraft | null {
  const template = storeTemplateById(opts.templateId);
  if (!template) return null;
  const logoUrl = opts.current?.settings?.logoUrl ?? null;
  const faviconUrl = opts.current?.settings?.faviconUrl ?? null;
  const name = sanitizeStoreLabel(opts.storeName);

  const settings =
    template.id === PROVIDER_STORE_TEMPLATE_ID
      ? providerStoreSettings()
      : applyDesignPreset(providerStoreSettings(), template.id as DesignPresetId);
  settings.logoUrl = logoUrl;
  settings.faviconUrl = faviconUrl;
  const home = homeSectionsForTemplate(template.id, name);
  if (!home.length) return null;

  return {
    templateId: template.id,
    settings,
    sections: {
      ...(opts.current?.sections || {}),
      home,
    },
  };
}

/** True when the saved draft differs from the template the merchant last chose. */
export function storeThemeIsCustomized(
  draft: ThemeDraft | null | undefined,
  storeName: string,
): boolean {
  if (!draft?.sections?.home?.length) return false;
  const templateId = draft.templateId || PROVIDER_STORE_TEMPLATE_ID;
  const expected = applyStoreTemplate({
    storeName,
    templateId,
    current: templateId === PROVIDER_STORE_TEMPLATE_ID ? null : draft,
  });
  if (!expected) return true;
  return themeFingerprint(draft, storeName) !== themeFingerprint(expected, storeName);
}

export function themeFingerprint(draft: ThemeDraft, storeName: string): string {
  const name = sanitizeStoreLabel(storeName);
  const settings = { ...draft.settings };
  delete settings.logoUrl;
  delete settings.faviconUrl;
  const home = (draft.sections.home || []).map((section) => {
    const props = { ...(section.props || {}) };
    if (section.type === "hero") {
      const headline = String(props.headline || "");
      const subhead = String(props.subhead || "");
      if (headline === name || BLOCKED_IDENTITY.test(headline)) props.headline = "";
      if (subhead === `Shop ${name}` || BLOCKED_IDENTITY.test(subhead)) props.subhead = "";
    }
    return { type: section.type, enabled: section.enabled, props };
  });
  return JSON.stringify({
    templateId: draft.templateId || PROVIDER_STORE_TEMPLATE_ID,
    settings,
    home,
  });
}

export function templateReplacesSections(templateId: string): boolean {
  return (
    templateId === PROVIDER_STORE_TEMPLATE_ID ||
    Object.prototype.hasOwnProperty.call(DESIGN_PRESETS, templateId)
  );
}

function templateCard(
  id: StoreTemplateId,
  label: string,
  description: string,
  bestFor: string,
  settings: ThemeSettings,
): StoreTemplateCard {
  const home = homeSectionsForTemplate(id, "Store");
  return {
    id,
    label,
    description,
    bestFor,
    settings,
    layoutLabel: layoutLabelFor(home),
    composition: compositionFor(home),
  };
}

function layoutLabelFor(home: ThemeSection[]): string {
  const parts: string[] = [];
  for (const section of home) {
    if (section.type === "header" || section.type === "footer") continue;
    if (section.type === "announcement") parts.push("Announcement");
    else if (section.type === "hero") {
      const layout = section.props?.layout;
      parts.push(
        layout === "split" ? "Split hero" : layout === "center" ? "Centered hero" : "Left hero",
      );
    } else if (section.type === "collections") parts.push("Collections");
    else if (section.type === "newsletter") parts.push("Updates");
    else if (section.type === "new_arrivals") {
      parts.push(section.props?.layout === "rail" ? "Arrivals rail" : "New arrivals");
    } else if (section.type === "best_sellers") {
      parts.push(section.props?.layout === "rail" ? "Best-seller rail" : "Best sellers");
    } else if (section.type === "featured_products") {
      parts.push(section.props?.layout === "rail" ? "Product rail" : "Product grid");
    }
  }
  return parts.join(" · ");
}

function compositionFor(home: ThemeSection[]): TemplateComposition[] {
  const marks: TemplateComposition[] = [];
  for (const section of home) {
    if (section.type === "header" || section.type === "footer") continue;
    if (section.type === "announcement") marks.push("bar");
    else if (section.type === "hero") {
      const layout = section.props?.layout;
      marks.push(layout === "split" ? "hero-split" : layout === "center" ? "hero-center" : "hero");
    } else if (section.type === "collections") marks.push("collections");
    else if (section.type === "newsletter") marks.push("note");
    else if (section.props?.layout === "rail") marks.push("rail");
    else marks.push("grid");
  }
  return marks;
}

function header(): ThemeSection {
  return { id: "header", type: "header", enabled: true };
}

function footer(): ThemeSection {
  return { id: "footer", type: "footer", enabled: true };
}

function announcement(): ThemeSection {
  return { id: "announcement", type: "announcement", enabled: true, props: { text: "" } };
}

function hero(name: string, layout: "left" | "center" | "split", height: "md" | "lg" | "xl"): ThemeSection {
  return {
    id: "hero",
    type: "hero",
    enabled: true,
    props: {
      eyebrow: "",
      headline: name,
      subhead: `Shop ${name}`,
      cta: "Shop now",
      ctaHref: "/collections/all",
      layout,
      height,
    },
  };
}

function products(
  id: string,
  type: "featured_products" | "best_sellers" | "new_arrivals",
  title: string,
  layout: "grid" | "rail",
  limit: number,
): ThemeSection {
  return { id, type, enabled: true, props: { title, layout, limit } };
}

function collections(): ThemeSection {
  return {
    id: "collections",
    type: "collections",
    enabled: true,
    props: { title: "Collections", layout: "tiles" },
  };
}

function newsletter(name: string): ThemeSection {
  return {
    id: "newsletter",
    type: "newsletter",
    enabled: true,
    props: { title: `Updates from ${name}`, subhead: "", cta: "Subscribe" },
  };
}

function sanitizeStoreLabel(storeName: string): string {
  const trimmed = storeName.trim();
  if (!trimmed || BLOCKED_IDENTITY.test(trimmed)) return "Your store";
  return trimmed.slice(0, 80);
}
