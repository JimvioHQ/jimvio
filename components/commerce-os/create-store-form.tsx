"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink } from "lucide-react";

type CreatedStore = {
  id: string;
  handle: string;
  url: string;
  publicUrl: string;
};

export function CreateStoreForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedStore | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/commerce/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          handle: handle || undefined,
          description: description || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === "string" ? json.error : "Could not create store."
        );
        return;
      }
      const store = json.store as CreatedStore | undefined;
      if (!store?.id || !store.publicUrl) {
        setError("Store was created but the response was incomplete.");
        return;
      }
      setCreated(store);
      router.refresh();
    } catch {
      setError("Request failed. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!created?.publicUrl) return;
    try {
      await navigator.clipboard.writeText(created.publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the store link. Copy it manually from the URL.");
    }
  }

  if (created) {
    return (
      <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#111827]">
              {name.trim() || "Store"} created
            </p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-[#374151]">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                Online
              </span>
              <span className="truncate font-medium text-[#111827]">
                {created.publicUrl}
              </span>
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">
              Your storefront is live. Add products when you are ready to sell —
              you can keep customizing in Store Builder without taking it offline.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={created.publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
          >
            Open store
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-[#374151]"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            {copied ? "Copied" : "Copy store link"}
          </button>
          <Link
            href={`/commerce/builder?storeId=${created.id}`}
            className="inline-flex items-center rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-[#374151]"
          >
            Customize store
          </Link>
          <Link
            href={`/commerce?storeId=${created.id}`}
            className="inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold text-[#6B7280] underline-offset-2 hover:underline"
          >
            Open Commerce OS
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4"
    >
      <div>
        <p className="text-sm font-medium text-[#111827]">Create a Jimvio store</p>
        <p className="mt-1 text-xs text-[#6B7280]">
          Goes live immediately at your-handle.jimvio.com — separate from Shopify
          connectors.
        </p>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-[#374151]">Store name</span>
        <input
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none focus:border-[#FF5A1F]"
          placeholder="My brand"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-[#374151]">
          Handle (optional)
        </span>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none focus:border-[#FF5A1F]"
          placeholder="my-brand"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-[#374151]">
          Description (optional)
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#FF5A1F]"
        />
      </label>
      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create store"}
      </button>
    </form>
  );
}
