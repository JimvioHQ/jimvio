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

export type StoreTemplateCard = {
  id: StoreTemplateId;
  label: string;
  description: string;
  bestFor: string;
  settings: ThemeSettings;
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
  const name = sanitizeStoreLabel(storeName);
  return [
    {
      id: "announcement",
      type: "announcement",
      enabled: true,
      props: { text: "" },
    },
    { id: "header", type: "header", enabled: true },
    {
      id: "hero",
      type: "hero",
      enabled: true,
      props: {
        eyebrow: "",
        headline: name,
        subhead: `Shop ${name}`,
        cta: "Shop now",
        ctaHref: "/collections/all",
        layout: "left",
        height: "lg",
      },
    },
    {
      id: "featured_products",
      type: "featured_products",
      enabled: true,
      props: { title: "Featured products", layout: "grid", limit: 8 },
    },
    { id: "footer", type: "footer", enabled: true },
  ];
}

export function buildProviderStoreDraft(storeName: string): ThemeDraft {
  return {
    templateId: PROVIDER_STORE_TEMPLATE_ID,
    settings: providerStoreSettings(),
    sections: { home: providerStoreHomeSections(storeName) },
  };
}

export function listStoreTemplates(): StoreTemplateCard[] {
  const provider: StoreTemplateCard = {
    id: PROVIDER_STORE_TEMPLATE_ID,
    label: "Provider Store",
    description:
      "Clean header, announcement bar, professional hero, and a featured product grid.",
    bestFor: "New online stores",
    settings: providerStoreSettings(),
  };
  const presets = (Object.keys(DESIGN_PRESETS) as DesignPresetId[]).map((id) => {
    const preset = DESIGN_PRESETS[id];
    return {
      id,
      label: preset.label,
      description: preset.description,
      bestFor: preset.bestFor,
      settings: mergeThemeSettings(providerStoreSettings(), preset.settings),
    };
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

  if (template.id === PROVIDER_STORE_TEMPLATE_ID) {
    const draft = buildProviderStoreDraft(name);
    draft.settings = {
      ...draft.settings,
      logoUrl,
      faviconUrl,
    };
    return draft;
  }

  const settings = applyDesignPreset(providerStoreSettings(), template.id as DesignPresetId);
  settings.logoUrl = logoUrl;
  settings.faviconUrl = faviconUrl;
  const home = (opts.current?.sections?.home?.length
    ? opts.current.sections.home
    : providerStoreHomeSections(name)
  ).map((section) => {
    if (section.type !== "hero") return section;
    const props = { ...(section.props || {}) };
    if (BLOCKED_IDENTITY.test(String(props.headline || ""))) props.headline = name;
    if (BLOCKED_IDENTITY.test(String(props.subhead || ""))) props.subhead = `Shop ${name}`;
    return { ...section, props };
  });

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
  return templateId === PROVIDER_STORE_TEMPLATE_ID;
}

function sanitizeStoreLabel(storeName: string): string {
  const trimmed = storeName.trim();
  if (!trimmed || BLOCKED_IDENTITY.test(trimmed)) return "Your store";
  return trimmed.slice(0, 80);
}
