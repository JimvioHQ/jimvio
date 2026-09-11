"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateDiscountForm({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed" | "free_shipping">(
    "percent"
  );
  const [value, setValue] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/commerce/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          title,
          code: code || null,
          discountType,
          value,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Create failed.");
        return;
      }
      setTitle("");
      setCode("");
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
      <p className="text-sm font-medium text-[#111827]">New discount</p>
      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm"
      />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Code (optional)"
        className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={discountType}
          onChange={(e) =>
            setDiscountType(e.target.value as "percent" | "fixed" | "free_shipping")
          }
          className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm"
        >
          <option value="percent">Percent</option>
          <option value="fixed">Fixed</option>
          <option value="free_shipping">Free shipping</option>
        </select>
        <input
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          disabled={discountType === "free_shipping"}
          className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm disabled:opacity-50"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create discount"}
      </button>
    </form>
  );
}
