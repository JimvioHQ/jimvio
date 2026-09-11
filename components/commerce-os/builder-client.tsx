"use client";

import { useMemo, useState } from "react";
import type { ThemeDraft, ThemeSection } from "@/lib/commerce-os/themes/registry";
import { reorderSections } from "@/lib/commerce-os/themes/registry";

type Props = {
  storeId: string;
  storeName: string;
  handle: string;
  initialDraft: ThemeDraft | null;
};

function ensureHomeSections(draft: ThemeDraft | null, storeName: string): ThemeSection[] {
  const home = draft?.sections?.home;
  if (Array.isArray(home) && home.length) return home as ThemeSection[];
  return [
    { id: "announcement", type: "announcement", enabled: true },
    { id: "header", type: "header", enabled: true },
    {
      id: "hero",
      type: "hero",
      enabled: true,
      props: { headline: storeName, subhead: "Shop the latest", cta: "Shop now" },
    },
    { id: "featured_products", type: "featured_products", enabled: true },
    { id: "footer", type: "footer", enabled: true },
  ];
}

export function BuilderClient({ storeId, storeName, handle, initialDraft }: Props) {
  const [sections, setSections] = useState<ThemeSection[]>(() =>
    ensureHomeSections(initialDraft, storeName)
  );
  const settings = initialDraft?.settings || {};
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hero = useMemo(
    () => sections.find((s) => s.type === "hero"),
    [sections]
  );

  function move(index: number, dir: -1 | 1) {
    setSections((prev) => reorderSections(prev, index, index + dir));
  }

  function toggle(id: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  }

  function updateHero(field: "headline" | "subhead" | "cta", value: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.type === "hero"
          ? { ...s, props: { ...(s.props || {}), [field]: value } }
          : s
      )
    );
  }

  function buildDraft(): ThemeDraft {
    return {
      settings: {
        primaryColor: "#FF5A1F",
        backgroundColor: "#F8FAFC",
        textColor: "#111827",
        fontFamily: "DM Sans",
        radius: "12px",
        ...settings,
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
      const res = await fetch("/api/commerce/builder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, theme_draft: buildDraft() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Save failed.");
        return;
      }
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
      const saveRes = await fetch("/api/commerce/builder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, theme_draft: buildDraft() }),
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
      setMessage("Theme published. Storefront uses the new settings.");
    } catch {
      setError("Could not publish theme.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-white p-4">
        <div>
          <p className="text-sm font-medium text-[#111827]">Home sections</p>
          <p className="mt-1 text-xs text-[#6B7280]">
            Reorder, toggle, and edit hero copy. Preview:{" "}
            <a
              href={`/s/${handle}`}
              className="font-semibold text-[#FF5A1F]"
              target="_blank"
              rel="noreferrer"
            >
              /s/{handle}
            </a>
          </p>
        </div>

        <ul className="space-y-2">
          {sections.map((section, index) => (
            <li
              key={section.id}
              className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium capitalize text-[#111827]">
                  {section.type.replace(/_/g, " ")}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="rounded border border-[#E5E7EB] px-1.5 py-0.5 text-xs disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={index === sections.length - 1}
                    onClick={() => move(index, 1)}
                    className="rounded border border-[#E5E7EB] px-1.5 py-0.5 text-xs disabled:opacity-40"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(section.id)}
                    className="rounded border border-[#E5E7EB] px-1.5 py-0.5 text-xs"
                  >
                    {section.enabled ? "On" : "Off"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {hero ? (
          <div className="space-y-2 border-t border-[#F3F4F6] pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              Hero text
            </p>
            <input
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
              value={String(hero.props?.headline ?? "")}
              onChange={(e) => updateHero("headline", e.target.value)}
              placeholder="Headline"
            />
            <input
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
              value={String(hero.props?.subhead ?? "")}
              onChange={(e) => updateHero("subhead", e.target.value)}
              placeholder="Subhead"
            />
            <input
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
              value={String(hero.props?.cta ?? "")}
              onChange={(e) => updateHero("cta", e.target.value)}
              placeholder="CTA"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveDraft()}
            className="rounded-md border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151] disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void publishTheme()}
            className="rounded-md bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Publish
          </button>
        </div>
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        {message ? (
          <p className="text-sm font-medium text-emerald-700">{message}</p>
        ) : null}
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <div className="mb-3 flex gap-2">
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
        <div
          className={
            device === "mobile"
              ? "mx-auto max-w-[375px] overflow-hidden rounded-xl border border-[#E5E7EB]"
              : "overflow-hidden rounded-xl border border-[#E5E7EB]"
          }
        >
          <div className="bg-[#FF5A1F] px-3 py-2 text-center text-[11px] font-medium text-white">
            {String(
              sections.find((s) => s.type === "announcement")?.props?.text ||
                "Announcement"
            )}
          </div>
          <div className="border-b border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold">
            {storeName}
          </div>
          {hero?.enabled ? (
            <div className="bg-[#F8FAFC] px-4 py-8">
              <p className="text-2xl font-semibold text-[#111827]">
                {String(hero.props?.headline || storeName)}
              </p>
              <p className="mt-2 text-sm text-[#6B7280]">
                {String(hero.props?.subhead || "")}
              </p>
              <span className="mt-4 inline-flex rounded-md bg-[#FF5A1F] px-3 py-1.5 text-xs font-semibold text-white">
                {String(hero.props?.cta || "Shop now")}
              </span>
            </div>
          ) : null}
          <div className="px-4 py-6 text-sm text-[#6B7280]">
            Featured products preview — live products appear on the public storefront.
          </div>
        </div>
      </div>
    </div>
  );
}
