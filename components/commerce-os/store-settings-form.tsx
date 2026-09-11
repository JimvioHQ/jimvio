"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Store = {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  announcement_bar: string | null;
  default_currency: string;
  default_country: string;
  status: string;
  industry: string | null;
};

export function StoreSettingsForm({ store }: { store: Store }) {
  const router = useRouter();
  const [form, setForm] = useState(store);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/commerce/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          logo_url: form.logo_url,
          favicon_url: form.favicon_url,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          announcement_bar: form.announcement_bar,
          default_currency: form.default_currency,
          default_country: form.default_country,
          industry: form.industry,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Save failed.");
        return;
      }
      setMessage("Settings saved.");
      router.refresh();
    } catch {
      setError("Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/commerce/stores/${store.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Publish failed.");
        return;
      }
      setMessage("Store published.");
      router.refresh();
    } catch {
      setError("Publish request failed.");
    } finally {
      setBusy(false);
    }
  }

  function field(
    key: keyof Store,
    label: string,
    opts?: { textarea?: boolean }
  ) {
    const value = form[key] ?? "";
    return (
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-[#374151]">{label}</span>
        {opts?.textarea ? (
          <textarea
            value={String(value)}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            rows={3}
            className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"
          />
        ) : (
          <input
            value={String(value)}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm"
          />
        )}
      </label>
    );
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border border-[#E5E7EB] bg-white p-4">
      <p className="text-xs text-[#6B7280]">
        Handle <span className="font-medium text-[#111827]">/s/{store.handle}</span> ·
        status {store.status}
      </p>
      {field("name", "Name")}
      {field("description", "Description", { textarea: true })}
      {field("announcement_bar", "Announcement bar")}
      {field("logo_url", "Logo URL")}
      {field("favicon_url", "Favicon URL")}
      {field("contact_email", "Contact email")}
      {field("contact_phone", "Contact phone")}
      {field("industry", "Industry")}
      <div className="grid grid-cols-2 gap-2">
        {field("default_currency", "Currency")}
        {field("default_country", "Country")}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151] disabled:opacity-50"
        >
          Save settings
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void publish()}
          className="rounded-md bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Publish store
        </button>
      </div>
    </form>
  );
}
