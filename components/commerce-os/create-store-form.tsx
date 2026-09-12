"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateStoreForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.refresh();
      if (json.store?.id) {
        router.push(`/commerce?storeId=${json.store.id}`);
      }
    } catch {
      setError("Request failed. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border border-[#E5E7EB] bg-white p-4"
    >
      <div>
        <p className="text-sm font-medium text-[#111827]">Create a Jimvio store</p>
        <p className="mt-1 text-xs text-[#6B7280]">
          Native storefront at your-handle.jimvio.com — separate from Shopify connectors.
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
