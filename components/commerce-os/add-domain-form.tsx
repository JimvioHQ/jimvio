"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddDomainForm({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [hostname, setHostname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/commerce/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, hostname }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not add domain.");
        return;
      }
      setHostname("");
      setMessage(
        "Domain added with verification and SSL pending. Complete DNS before expecting live custom routing."
      );
      router.refresh();
    } catch {
      setError("Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border border-[#E5E7EB] bg-white p-4"
    >
      <p className="text-sm font-medium text-[#111827]">Add custom domain</p>
      <input
        required
        value={hostname}
        onChange={(e) => setHostname(e.target.value)}
        placeholder="shop.example.com"
        className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add domain"}
      </button>
    </form>
  );
}
