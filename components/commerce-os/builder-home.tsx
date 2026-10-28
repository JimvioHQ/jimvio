"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StorefrontHomeSections } from "@/components/commerce-os/storefront-home-sections";
import { TemplateThumbnail } from "@/components/commerce-os/template-thumbnail";
import { storefrontDisplayUrl } from "@/lib/commerce-os/storefront-url";
import { themeSettingsToCssVars, type ThemeDraft } from "@/lib/commerce-os/themes/registry";
import {
  applyStoreTemplate,
  listStoreTemplates,
  storeTemplateById,
  storeThemeIsCustomized,
  templateReplacesSections,
  type StoreTemplateId,
} from "@/lib/commerce-os/themes/store-template";

type PreviewProduct = {
  id: string;
  name: string;
  slug: string;
  price: number | string | null;
  compare_at_price?: number | string | null;
  currency?: string | null;
  images?: unknown;
};

type PreviewCollection = {
  id: string;
  title: string;
  handle: string;
  image_url?: string | null;
};

type Props = {
  storeId: string;
  storeName: string;
  handle: string;
  status?: string | null;
  updatedAt?: string | null;
  publishedThemeAt?: string | null;
  initialDraft: ThemeDraft | null;
  previewTemplateId?: string | null;
  previewProducts: PreviewProduct[];
  previewCollections?: PreviewCollection[];
};

export function BuilderHome({
  storeId,
  storeName,
  handle,
  status,
  updatedAt,
  publishedThemeAt,
  initialDraft,
  previewTemplateId,
  previewProducts,
  previewCollections = [],
}: Props) {
  const router = useRouter();
  const templates = useMemo(() => listStoreTemplates(), []);
  const [draft, setDraft] = useState<ThemeDraft | null>(initialDraft);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const currentId = draft?.templateId || "provider";
  const current = storeTemplateById(currentId) || templates[0];
  const preview = previewTemplateId ? storeTemplateById(previewTemplateId) : null;
  const liveUrl = storefrontDisplayUrl(handle);
  const editorHref = `/commerce/builder?storeId=${storeId}&view=editor`;
  const settingsHref = `/commerce/settings?storeId=${storeId}`;
  const published = status === "published";

  const previewDraft = preview
    ? applyStoreTemplate({
        storeName,
        templateId: preview.id,
        current: draft,
      })
    : null;

  async function applyTemplate(templateId: StoreTemplateId) {
    setError(null);
    setMessage(null);
    const next = applyStoreTemplate({ storeName, templateId, current: draft });
    if (!next) {
      setError("That template is not available.");
      return;
    }
    const customized = storeThemeIsCustomized(draft, storeName);
    const switching = (draft?.templateId || "provider") !== templateId;
    if (!customized && !switching) {
      setMessage("This store already uses that template.");
      return;
    }
    if (customized || switching) {
      const detail = templateReplacesSections(templateId)
        ? "This replaces the homepage draft with this template's layout. Your logo, products, pages, policies, and orders stay on this store."
        : "Colors, typography, and buttons update. Homepage sections, products, pages, and orders stay in place.";
      const confirmed = window.confirm(
        `Use this template?\n\n${detail}\n\nThis saves a draft. It does not publish until you choose Publish.`,
      );
      if (!confirmed) return;
    }
    setBusyId(templateId);
    try {
      const res = await fetch("/api/commerce/builder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, theme_draft: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not save the template.");
        return;
      }
      setDraft(next);
      setMessage("Template saved to your draft. Publish from the editor when you are ready.");
      router.replace(`/commerce/builder?storeId=${storeId}`);
      router.refresh();
    } catch {
      setError("Could not save the template.");
    } finally {
      setBusyId(null);
    }
  }

  if (preview && previewDraft) {
    const products = previewProducts.length
      ? previewProducts
      : [
          {
            id: "sample-product",
            name: "Sample product",
            slug: "sample-product",
            price: 24,
            currency: "USD",
            images: [],
          },
        ];
    const illustrative = previewProducts.length === 0;
    return (
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
              Template preview
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111827]">{preview.label}</h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[#6B7280]">{preview.description}</p>
            <p className="mt-2 text-xs font-medium text-[#374151]">{preview.layoutLabel}</p>
            <p className="mt-1 text-xs text-[#6B7280]">Best for {preview.bestFor}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/commerce/builder?storeId=${storeId}`}
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#374151] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A1F]"
            >
              Back to templates
            </Link>
            <button
              type="button"
              disabled={busyId === preview.id}
              aria-busy={busyId === preview.id}
              onClick={() => void applyTemplate(preview.id)}
              className="rounded-lg bg-[#FF5A1F] px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111827] disabled:opacity-60"
            >
              {busyId === preview.id ? "Saving…" : "Use this template"}
            </button>
          </div>
        </div>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2" role="group" aria-label="Preview width">
          {(["desktop", "mobile"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={device === item}
              onClick={() => setDevice(item)}
              className={
                device === item
                  ? "rounded-full bg-[#111827] px-3 py-1 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A1F]"
                  : "rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-semibold text-[#374151] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A1F]"
              }
            >
              {item === "desktop" ? "Desktop" : "Mobile"}
            </button>
          ))}
        </div>
        <p className="text-xs leading-5 text-[#6B7280]">
          {illustrative
            ? "This store has no products yet. The sample card is only for this preview and is not added to the catalog."
            : "Preview uses this store's published products. Nothing here is published until you choose Publish."}
        </p>
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] p-3 sm:p-4">
          <div
            className="mx-auto overflow-hidden rounded-xl border border-[#E5E7EB] bg-white"
            style={{ width: device === "mobile" ? 390 : "100%" }}
          >
            <div style={themeSettingsToCssVars(previewDraft.settings)}>
              <StorefrontHomeSections
                sections={previewDraft.sections.home}
                products={products}
                collections={previewCollections}
                handle={handle}
                storeName={storeName}
                themeSettings={previewDraft.settings}
                device={device}
                preview
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Store overview
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#111827]">{storeName}</h1>
            <p className="mt-2 text-sm text-[#374151]">
              <span
                className={
                  published
                    ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                    : "rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800"
                }
              >
                {published ? "Published" : "Draft"}
              </span>
            </p>
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block truncate text-sm font-medium text-[#FF5A1F] hover:underline"
            >
              {liveUrl.replace(/^https:\/\//, "")}
            </a>
            <p className="mt-2 text-sm text-[#6B7280]">
              Current template: {current?.label || "Custom"}
              {current?.layoutLabel ? ` · ${current.layoutLabel}` : ""}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">
              {updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : "Not saved yet"}
              {publishedThemeAt
                ? ` · Last published ${new Date(publishedThemeAt).toLocaleString()}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={editorHref}
              className="rounded-lg bg-[#FF5A1F] px-3 py-2 text-sm font-semibold text-white"
            >
              Edit Store
            </Link>
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#374151]"
            >
              View live store
            </a>
            <Link
              href={settingsHref}
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#374151]"
            >
              Manage settings
            </Link>
          </div>
        </div>
        {message ? (
          <p className="mt-4 text-sm text-emerald-700" role="status">
            {message}{" "}
            <Link href={editorHref} className="font-semibold underline">
              Edit Store
            </Link>
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-[#111827]">Choose a template</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6B7280]">
          Each template is a homepage layout. Choosing one saves a draft and does not publish it. Products, pages, policies, and orders stay on this store.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const selected = template.id === currentId && !storeThemeIsCustomized(draft, storeName);
            return (
              <article
                key={template.id}
                className={
                  selected
                    ? "flex flex-col rounded-2xl border border-[#FF5A1F] bg-white p-3 shadow-sm"
                    : "flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-3"
                }
              >
                <TemplateThumbnail
                  settings={template.settings}
                  label={template.label}
                  composition={template.composition}
                />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#111827]">{template.label}</h3>
                  {selected ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Current
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs font-medium leading-5 text-[#374151]">{template.layoutLabel}</p>
                <p className="mt-1 text-sm leading-5 text-[#6B7280]">{template.description}</p>
                <p className="mt-2 text-xs text-[#6B7280]">Best for {template.bestFor}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/commerce/builder?storeId=${storeId}&view=template&template=${template.id}`}
                    className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#374151] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A1F]"
                  >
                    Preview template
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === template.id}
                    aria-busy={busyId === template.id}
                    onClick={() => void applyTemplate(template.id)}
                    className="rounded-lg bg-[#111827] px-3 py-1.5 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A1F] disabled:opacity-60"
                  >
                    {busyId === template.id ? "Saving…" : "Use template"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
