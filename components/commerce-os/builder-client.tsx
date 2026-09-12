"use client";

import { useMemo, useState } from "react";
import {
  BUILDER_SECTION_CATALOG,
  DEFAULT_THEME_SETTINGS,
  createCatalogSection,
  mergeThemeSettings,
  reorderSections,
  themeSettingsToCssVars,
  type ButtonStyle,
  type ThemeDraft,
  type ThemeSection,
  type ThemeSettings,
} from "@/lib/commerce-os/themes/registry";
import {
  storefrontDisplayHost,
  storefrontDisplayUrl,
} from "@/lib/commerce-os/storefront-url";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";

type Props = {
  storeId: string;
  storeName: string;
  handle: string;
  logoUrl?: string | null;
  status?: string;
  initialDraft: ThemeDraft | null;
};

function ensureHomeSections(draft: ThemeDraft | null, storeName: string): ThemeSection[] {
  const home = draft?.sections?.home;
  if (Array.isArray(home) && home.length) return home as ThemeSection[];
  return [
    {
      id: "announcement",
      type: "announcement",
      enabled: true,
      props: { text: "Free shipping on select orders" },
    },
    { id: "header", type: "header", enabled: true },
    {
      id: "hero",
      type: "hero",
      enabled: true,
      props: {
        headline: storeName,
        subhead: "Shop the latest",
        cta: "Shop now",
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

type Panel = "brand" | "theme" | "sections";

export function BuilderClient({
  storeId,
  storeName,
  handle,
  logoUrl,
  status,
  initialDraft,
}: Props) {
  const [sections, setSections] = useState<ThemeSection[]>(() =>
    ensureHomeSections(initialDraft, storeName)
  );
  const [settings, setSettings] = useState<ThemeSettings>(() =>
    mergeThemeSettings(DEFAULT_THEME_SETTINGS, {
      ...(initialDraft?.settings || {}),
      logoUrl: initialDraft?.settings?.logoUrl || logoUrl || null,
    })
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () => ensureHomeSections(initialDraft, storeName).find((s) => s.type === "hero")?.id || null
  );
  const [panel, setPanel] = useState<Panel>("sections");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const liveUrl = storefrontDisplayUrl(handle);
  const liveHost = storefrontDisplayHost(handle);
  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) || null,
    [sections, selectedId]
  );
  const cssVars = themeSettingsToCssVars(settings);
  const logo = settings.logoUrl || logoUrl || null;

  function markDirty() {
    setDirty(true);
    setMessage(null);
  }

  function patchSettings(patch: Partial<ThemeSettings>) {
    setSettings((prev) => mergeThemeSettings(prev, patch));
    markDirty();
  }

  function move(index: number, dir: -1 | 1) {
    setSections((prev) => reorderSections(prev, index, index + dir));
    markDirty();
  }

  function toggle(id: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
    markDirty();
  }

  function updateSectionProps(id: string, patch: Record<string, unknown>) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, props: { ...(s.props || {}), ...patch } } : s
      )
    );
    markDirty();
  }

  function addSection(type: ThemeSection["type"]) {
    const section = createCatalogSection(type, storeName);
    setSections((prev) => {
      const footerIdx = prev.findIndex((s) => s.type === "footer");
      if (footerIdx >= 0) {
        const next = [...prev];
        next.splice(footerIdx, 0, section);
        return next;
      }
      return [...prev, section];
    });
    setSelectedId(section.id);
    setPanel("sections");
    markDirty();
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
    markDirty();
  }

  function buildDraft(): ThemeDraft {
    return {
      settings: {
        ...settings,
        logoUrl: settings.logoUrl || logoUrl || null,
      },
      sections: {
        ...(initialDraft?.sections || {}),
        home: sections,
      },
    };
  }

  async function saveDraft() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const draft = buildDraft();
      const res = await fetch("/api/commerce/builder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          theme_draft: draft,
          logo_url: draft.settings.logoUrl || null,
          favicon_url: draft.settings.faviconUrl || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Save failed.");
        return;
      }
      setDirty(false);
      setMessage("Draft saved.");
    } catch {
      setError("Could not save draft.");
    } finally {
      setBusy(false);
    }
  }

  async function publishTheme() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const draft = buildDraft();
      const saveRes = await fetch("/api/commerce/builder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          theme_draft: draft,
          logo_url: draft.settings.logoUrl || null,
          favicon_url: draft.settings.faviconUrl || null,
        }),
      });
      if (!saveRes.ok) {
        const json = await saveRes.json().catch(() => ({}));
        setError(typeof json.error === "string" ? json.error : "Save before publish failed.");
        return;
      }
      const res = await fetch("/api/commerce/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, action: "publish" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Publish failed.");
        return;
      }
      setDirty(false);
      setMessage("Published — live on " + liveHost);
    } catch {
      setError("Could not publish theme.");
    } finally {
      setBusy(false);
    }
  }

  const buttonClass =
    settings.buttonStyle === "outline"
      ? "border-2 bg-transparent"
      : settings.buttonStyle === "ghost"
        ? "bg-transparent"
        : "border-0";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#111827]">{storeName}</p>
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-[#FF5A1F] hover:underline"
          >
            {liveHost} ↗
          </a>
          <p className="mt-1 text-[11px] text-[#6B7280]">
            {status === "published" ? "Published storefront" : "Draft store"}
            {dirty ? " · Unsaved changes" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
          >
            View Store
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveDraft()}
            className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151] disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void publishTheme()}
            className="rounded-lg bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_280px]">
        <aside className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
          <div className="flex gap-1 rounded-lg bg-[#F3F4F6] p-1">
            {([
              ["brand", "Brand"],
              ["theme", "Theme"],
              ["sections", "Sections"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPanel(id)}
                className={
                  panel === id
                    ? "flex-1 rounded-md bg-white px-2 py-1.5 text-xs font-semibold text-[#111827] shadow-sm"
                    : "flex-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#6B7280]"
                }
              >
                {label}
              </button>
            ))}
          </div>

          {panel === "brand" ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Store identity
              </p>
              <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <span
                    className="grid h-14 w-14 place-items-center rounded-xl text-lg font-bold text-white"
                    style={{ background: settings.primaryColor }}
                  >
                    {storeName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{storeName}</p>
                  <p className="truncate text-xs text-[#6B7280]">{liveHost}</p>
                </div>
              </div>
              <CloudinaryUploadButton
                folder="jimvio/vendor-logos"
                resourceType="image"
                buttonText={logo ? "Replace logo" : "Upload logo"}
                onUploadSuccess={(url) => patchSettings({ logoUrl: url })}
                onUploadError={(err) => setError(err)}
              />
              {logo ? (
                <button
                  type="button"
                  onClick={() => patchSettings({ logoUrl: null })}
                  className="text-xs font-semibold text-[#6B7280] underline"
                >
                  Remove logo
                </button>
              ) : null}
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-[#374151]">Favicon URL</span>
                <input
                  className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
                  value={settings.faviconUrl || ""}
                  onChange={(e) => patchSettings({ faviconUrl: e.target.value || null })}
                  placeholder="Optional"
                />
              </label>
            </div>
          ) : null}

          {panel === "theme" ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Colors & buttons
              </p>
              {(
                [
                  ["primaryColor", "Primary"],
                  ["backgroundColor", "Background"],
                  ["surfaceColor", "Surface"],
                  ["textColor", "Text"],
                  ["mutedTextColor", "Muted text"],
                  ["buttonColor", "Button"],
                  ["buttonTextColor", "Button text"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-[#374151]">{label}</span>
                  <input
                    type="color"
                    value={String(settings[key] || DEFAULT_THEME_SETTINGS[key] || "#000000")}
                    onChange={(e) => patchSettings({ [key]: e.target.value })}
                    className="h-8 w-12 cursor-pointer rounded border border-[#E5E7EB] bg-white"
                  />
                </label>
              ))}
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-[#374151]">Button style</span>
                <select
                  className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
                  value={settings.buttonStyle || "filled"}
                  onChange={(e) =>
                    patchSettings({ buttonStyle: e.target.value as ButtonStyle })
                  }
                >
                  <option value="filled">Filled</option>
                  <option value="outline">Outline</option>
                  <option value="ghost">Ghost</option>
                </select>
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-[#374151]">Corner radius</span>
                <select
                  className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
                  value={settings.radius}
                  onChange={(e) => patchSettings({ radius: e.target.value })}
                >
                  <option value="8px">Soft 8px</option>
                  <option value="12px">Default 12px</option>
                  <option value="16px">Rounded 16px</option>
                  <option value="24px">Pill-ish 24px</option>
                </select>
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-[#374151]">Product grid</span>
                <select
                  className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
                  value={String(settings.productGridColumns || 3)}
                  onChange={(e) =>
                    patchSettings({
                      productGridColumns: Number(e.target.value) as 2 | 3 | 4,
                    })
                  }
                >
                  <option value="2">2 columns</option>
                  <option value="3">3 columns</option>
                  <option value="4">4 columns</option>
                </select>
              </label>
            </div>
          ) : null}

          {panel === "sections" ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Homepage sections
              </p>
              <ul className="max-h-[420px] space-y-1.5 overflow-y-auto">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(section.id)}
                      className={
                        selectedId === section.id
                          ? "flex w-full items-center justify-between rounded-lg border border-[#FF5A1F]/40 bg-[#FF5A1F]/5 px-2.5 py-2 text-left text-xs"
                          : "flex w-full items-center justify-between rounded-lg border border-[#E5E7EB] px-2.5 py-2 text-left text-xs hover:bg-[#F9FAFB]"
                      }
                    >
                      <span className="font-semibold capitalize text-[#111827]">
                        {section.type.replace(/_/g, " ")}
                        {!section.enabled ? " (off)" : ""}
                      </span>
                      <span className="flex gap-1">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            move(index, -1);
                          }}
                          className="rounded border border-[#E5E7EB] px-1"
                        >
                          ↑
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            move(index, 1);
                          }}
                          className="rounded border border-[#E5E7EB] px-1"
                        >
                          ↓
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-[#374151]">Add section</span>
                <select
                  className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    const type = e.target.value as ThemeSection["type"];
                    if (type) addSection(type);
                    e.target.value = "";
                  }}
                >
                  <option value="" disabled>
                    Choose section…
                  </option>
                  {BUILDER_SECTION_CATALOG.map((c) => (
                    <option key={c.type} value={c.type}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </aside>

        <section className="rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Live preview
            </p>
            <div className="flex gap-1 rounded-lg bg-white p-1">
              {(["desktop", "mobile"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDevice(d)}
                  className={
                    device === d
                      ? "rounded-md bg-[#FF5A1F]/10 px-3 py-1.5 text-xs font-semibold text-[#FF5A1F]"
                      : "rounded-md px-3 py-1.5 text-xs font-medium text-[#6B7280]"
                  }
                >
                  {d === "desktop" ? "Desktop" : "Mobile"}
                </button>
              ))}
            </div>
          </div>
          <div
            className={
              device === "mobile"
                ? "mx-auto max-w-[390px] overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-sm"
                : "overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-sm"
            }
            style={{
              ...cssVars,
              background: "var(--store-bg)",
              color: "var(--store-text)",
              fontFamily: `${settings.fontFamily}, system-ui, sans-serif`,
            }}
          >
            {sections
              .filter((s) => s.enabled)
              .map((section) => {
                if (section.type === "announcement") {
                  return (
                    <div
                      key={section.id}
                      className="px-3 py-2 text-center text-[11px] font-semibold text-white"
                      style={{ background: "var(--store-primary)" }}
                    >
                      {String(section.props?.text || "Announcement")}
                    </div>
                  );
                }
                if (section.type === "header") {
                  return (
                    <div
                      key={section.id}
                      className="flex items-center justify-between gap-3 border-b px-4 py-3"
                      style={{ borderColor: "var(--store-border)", background: "var(--store-surface)" }}
                    >
                      <div className="flex items-center gap-2">
                        {logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logo} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <span
                            className="grid h-8 w-8 place-items-center rounded-lg text-xs font-bold text-white"
                            style={{ background: "var(--store-primary)" }}
                          >
                            {storeName.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="text-sm font-semibold">{storeName}</span>
                      </div>
                      <div className="hidden gap-3 text-xs opacity-70 sm:flex">
                        <span>Home</span>
                        <span>Shop</span>
                        <span>Cart</span>
                      </div>
                    </div>
                  );
                }
                if (section.type === "hero") {
                  return (
                    <div key={section.id} className="px-5 py-10 sm:px-8 sm:py-14">
                      <p
                        className="text-[11px] font-bold uppercase tracking-[0.16em]"
                        style={{ color: "var(--store-primary)" }}
                      >
                        Official store
                      </p>
                      <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                        {String(section.props?.headline || storeName)}
                      </h2>
                      <p className="mt-3 max-w-md text-sm opacity-70">
                        {String(section.props?.subhead || "")}
                      </p>
                      <span
                        className={`mt-5 inline-flex px-4 py-2 text-xs font-semibold ${buttonClass}`}
                        style={{
                          background:
                            settings.buttonStyle === "filled"
                              ? "var(--store-btn)"
                              : "transparent",
                          color:
                            settings.buttonStyle === "filled"
                              ? "var(--store-btn-text)"
                              : "var(--store-btn)",
                          borderColor: "var(--store-btn)",
                          borderRadius: "var(--store-btn-radius)",
                        }}
                      >
                        {String(section.props?.cta || "Shop now")}
                      </span>
                    </div>
                  );
                }
                if (
                  section.type === "featured_products" ||
                  section.type === "best_sellers" ||
                  section.type === "new_arrivals" ||
                  section.type === "collections"
                ) {
                  const cols = settings.productGridColumns || 3;
                  return (
                    <div key={section.id} className="px-4 py-8 sm:px-6">
                      <p className="text-lg font-semibold">
                        {String(section.props?.title || section.type.replace(/_/g, " "))}
                      </p>
                      <div
                        className="mt-4 grid gap-3"
                        style={{
                          gridTemplateColumns: `repeat(${device === "mobile" ? 2 : cols}, minmax(0, 1fr))`,
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6].slice(0, cols * (device === "mobile" ? 1 : 1)).map((n) => (
                          <div
                            key={n}
                            className="overflow-hidden border"
                            style={{
                              borderColor: "var(--store-border)",
                              borderRadius: "calc(var(--store-radius) + 4px)",
                              background: "var(--store-surface)",
                            }}
                          >
                            <div className="aspect-[4/3] bg-[#E5E7EB]" />
                            <div className="p-3">
                              <p className="text-xs font-medium">Product {n}</p>
                              <p className="mt-1 text-xs opacity-60">Live catalog on publish</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                if (section.type === "banner") {
                  return (
                    <div
                      key={section.id}
                      className="border-y px-4 py-8 text-center"
                      style={{
                        borderColor: "var(--store-border)",
                        background: "var(--store-surface)",
                      }}
                    >
                      <p className="text-sm font-semibold">
                        {String(section.props?.headline || "Why shop with us")}
                      </p>
                      <p className="mt-2 text-xs opacity-65">
                        {String(section.props?.subhead || "")}
                      </p>
                    </div>
                  );
                }
                if (section.type === "image_text") {
                  return (
                    <div key={section.id} className="grid gap-4 px-4 py-8 sm:grid-cols-2 sm:px-6">
                      <div
                        className="aspect-[4/3] bg-[#E5E7EB]"
                        style={{ borderRadius: "var(--store-radius)" }}
                      />
                      <div>
                        <p className="text-lg font-semibold">
                          {String(section.props?.headline || "Our story")}
                        </p>
                        <p className="mt-2 text-sm opacity-70">
                          {String(section.props?.body || "")}
                        </p>
                      </div>
                    </div>
                  );
                }
                if (section.type === "testimonials") {
                  return (
                    <div key={section.id} className="px-4 py-8 text-center sm:px-6">
                      <p className="text-lg font-semibold">
                        {String(section.props?.title || "Testimonials")}
                      </p>
                      <p className="mx-auto mt-3 max-w-md text-sm italic opacity-75">
                        “{String(section.props?.quote || "")}”
                      </p>
                      <p className="mt-2 text-xs font-semibold opacity-60">
                        {String(section.props?.author || "")}
                      </p>
                    </div>
                  );
                }
                if (section.type === "faq") {
                  return (
                    <div key={section.id} className="space-y-3 px-4 py-8 sm:px-6">
                      <p className="text-lg font-semibold">
                        {String(section.props?.title || "FAQ")}
                      </p>
                      <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "var(--store-border)" }}>
                        <p className="font-medium">{String(section.props?.q1 || "")}</p>
                        <p className="mt-1 opacity-70">{String(section.props?.a1 || "")}</p>
                      </div>
                    </div>
                  );
                }
                if (section.type === "newsletter") {
                  return (
                    <div
                      key={section.id}
                      className="px-4 py-8 text-center sm:px-6"
                      style={{ background: "var(--store-surface)" }}
                    >
                      <p className="text-lg font-semibold">
                        {String(section.props?.title || "Stay in the loop")}
                      </p>
                      <p className="mt-1 text-sm opacity-70">
                        {String(section.props?.subhead || "")}
                      </p>
                      <span
                        className="mt-4 inline-flex px-4 py-2 text-xs font-semibold text-white"
                        style={{
                          background: "var(--store-btn)",
                          borderRadius: "var(--store-btn-radius)",
                        }}
                      >
                        {String(section.props?.cta || "Notify me")}
                      </span>
                    </div>
                  );
                }
                if (section.type === "footer") {
                  return (
                    <div
                      key={section.id}
                      className="border-t px-4 py-8"
                      style={{
                        borderColor: "var(--store-border)",
                        background: "var(--store-surface)",
                      }}
                    >
                      <p className="text-sm font-semibold">{storeName}</p>
                      <p className="mt-1 text-xs opacity-50">Powered by Jimvio</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs opacity-70">
                        <span>About</span>
                        <span>Contact</span>
                        <span>Terms</span>
                        <span>Privacy</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
          </div>
        </section>

        <aside className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
            Section settings
          </p>
          {!selected ? (
            <p className="mt-3 text-sm text-[#6B7280]">Select a section to edit.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold capitalize text-[#111827]">
                  {selected.type.replace(/_/g, " ")}
                </p>
                <button
                  type="button"
                  onClick={() => toggle(selected.id)}
                  className="rounded-md border border-[#E5E7EB] px-2 py-1 text-xs font-semibold"
                >
                  {selected.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>

              {selected.type === "announcement" ? (
                <label className="block text-xs">
                  <span className="mb-1 block font-medium">Announcement text</span>
                  <input
                    className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
                    value={String(selected.props?.text || "")}
                    onChange={(e) =>
                      updateSectionProps(selected.id, { text: e.target.value })
                    }
                  />
                </label>
              ) : null}

              {selected.type === "hero" ? (
                <>
                  {(["headline", "subhead", "cta"] as const).map((field) => (
                    <label key={field} className="block text-xs">
                      <span className="mb-1 block font-medium capitalize">{field}</span>
                      <input
                        className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
                        value={String(selected.props?.[field] || "")}
                        onChange={(e) =>
                          updateSectionProps(selected.id, { [field]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                  <label className="block text-xs">
                    <span className="mb-1 block font-medium">CTA destination</span>
                    <select
                      className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
                      value={String(selected.props?.ctaHref || "/collections/all")}
                      onChange={(e) =>
                        updateSectionProps(selected.id, { ctaHref: e.target.value })
                      }
                    >
                      <option value="/collections/all">All products</option>
                      <option value="/search">Search</option>
                      <option value="/pages/about">About</option>
                      <option value="/pages/contact">Contact</option>
                      <option value="/cart">Cart</option>
                    </select>
                  </label>
                </>
              ) : null}

              {(
                selected.type === "featured_products" ||
                selected.type === "best_sellers" ||
                selected.type === "new_arrivals" ||
                selected.type === "collections" ||
                selected.type === "banner" ||
                selected.type === "testimonials" ||
                selected.type === "faq" ||
                selected.type === "newsletter" ||
                selected.type === "image_text"
              ) ? (
                <>
                  {Object.entries(selected.props || {})
                    .filter(([k]) => typeof selected.props?.[k] === "string")
                    .map(([key, value]) => (
                      <label key={key} className="block text-xs">
                        <span className="mb-1 block font-medium capitalize">
                          {key.replace(/_/g, " ")}
                        </span>
                        <input
                          className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
                          value={String(value || "")}
                          onChange={(e) =>
                            updateSectionProps(selected.id, { [key]: e.target.value })
                          }
                        />
                      </label>
                    ))}
                </>
              ) : null}

              {!["header", "footer"].includes(selected.type) ? (
                <button
                  type="button"
                  onClick={() => removeSection(selected.id)}
                  className="text-xs font-semibold text-red-600 underline"
                >
                  Remove section
                </button>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
