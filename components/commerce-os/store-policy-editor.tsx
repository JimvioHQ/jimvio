"use client";

import { useEffect, useState } from "react";
import {
  defaultStorePageHtml,
  isPlaceholderStorePageHtml,
  isStorePolicyHandle,
} from "@/lib/commerce-os/storefront/page-content";

type PageRow = {
  id: string;
  title: string;
  handle: string;
  body_html: string | null;
  published: boolean;
};

const POLICY_ORDER = [
  "about",
  "contact",
  "shipping-policy",
  "refund-policy",
  "privacy",
  "terms",
];

function editorDraft(
  page: PageRow,
  storeName: string,
  contactEmail?: string | null,
  contactPhone?: string | null,
) {
  if (isStorePolicyHandle(page.handle) && isPlaceholderStorePageHtml(page.body_html)) {
    return defaultStorePageHtml(page.handle, storeName, {
      email: contactEmail,
      phone: contactPhone,
    });
  }
  return page.body_html || "";
}

export function StorePolicyEditor({
  storeId,
  storeName,
  contactEmail,
  contactPhone,
  onDirtyChange,
}: {
  storeId: string;
  storeName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/commerce/pages?storeId=${encodeURIComponent(storeId)}`);
        const json = (await res.json()) as { pages?: PageRow[]; error?: string };
        if (!res.ok) throw new Error(json.error || "Could not load pages.");
        if (cancelled) return;
        const list = (json.pages || [])
          .filter((page) => isStorePolicyHandle(page.handle))
          .sort(
            (a, b) => POLICY_ORDER.indexOf(a.handle) - POLICY_ORDER.indexOf(b.handle),
          );
        setPages(list);
        const first = list[0];
        if (first) {
          setActiveId(first.id);
          setDraft(editorDraft(first, storeName, contactEmail, contactPhone));
          setTitle(first.title);
          setPublished(first.published);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load pages.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [storeId, storeName, contactEmail, contactPhone]);

  const active = pages.find((page) => page.id === activeId) || null;
  const usingDefault = active ? isPlaceholderStorePageHtml(active.body_html) : false;

  function selectPage(page: PageRow) {
    if (dirty && !window.confirm("Discard unsaved page changes?")) return;
    setActiveId(page.id);
    setDraft(editorDraft(page, storeName, contactEmail, contactPhone));
    setTitle(page.title);
    setPublished(page.published);
    setDirty(false);
    setMessage(null);
    setError(null);
  }

  async function save() {
    if (!active) return;
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError("Title is required.");
      return;
    }
    if (draft.length > 100_000) {
      setError("Page content is too long.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/commerce/pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          pageId: active.id,
          title: nextTitle,
          body_html: draft,
          published,
        }),
      });
      const json = (await res.json()) as { page?: PageRow; error?: string };
      if (!res.ok || !json.page) {
        throw new Error(json.error || "Could not save this page.");
      }
      setPages((prev) => prev.map((page) => (page.id === json.page!.id ? json.page! : page)));
      setDirty(false);
      setMessage(published ? "Published." : "Saved as draft.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this page.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[#6B7280]">Loading store pages…</p>;
  }

  if (!pages.length) {
    return (
      <p className="text-sm text-[#6B7280]">
        No About, Contact, or policy pages were found for this store.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            onClick={() => selectPage(page)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              page.id === activeId
                ? "border-[#FF5A1F] bg-[#FFF4EE] text-[#9A3412]"
                : "border-[#E5E7EB] text-[#374151]"
            }`}
          >
            {page.title}
          </button>
        ))}
      </div>
      {active ? (
        <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#6B7280]">
            {usingDefault
              ? "Customers currently see the professional default until you save your own copy."
              : "Customers see this saved copy. Defaults are not applied over it."}
          </p>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-[#374151]">Title</span>
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setDirty(true);
              }}
              className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-[#374151]">
              Content (HTML)
            </span>
            <textarea
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setDirty(true);
              }}
              rows={10}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 font-mono text-xs"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#374151]">
            <input
              type="checkbox"
              checked={published}
              onChange={(event) => {
                setPublished(event.target.checked);
                setDirty(true);
              }}
            />
            Published
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={() => void save()}
              className="rounded-lg bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save page"}
            </button>
            <span className="text-xs text-[#6B7280]">
              {dirty ? "Unsaved changes" : message || "Up to date"}
            </span>
          </div>
          {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
