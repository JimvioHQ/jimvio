"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Download, Loader2, Package, ShieldCheck } from "lucide-react";

type ImportResult = {
  success?: boolean;
  productId?: string;
  variantsImported?: number;
  videosImported?: number;
  warning?: string;
  error?: string;
};

export default function CjPidImport() {
  const [pid, setPid] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedPid = pid.trim();
    if (!selectedPid) {
      setError("Enter a CJ product ID first.");
      setResult(null);
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/cj/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid: selectedPid }),
      });
      const payload = (await response.json()) as ImportResult;
      if (!response.ok || payload.success !== true) {
        throw new Error(payload.error || "CJ product import failed.");
      }
      setResult(payload);
      setPid("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "CJ product import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F05A24]">Marketplace sourcing</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">Import from CJ</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
          Import only the products you choose. Paste a CJ Product ID and Jimvio will retrieve the
          current product details, variants, stock, videos and shipping information directly from CJ.
        </p>
      </div>

      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF1EA] text-[#F05A24]">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-[#111827]">Import one selected product</h2>
            <p className="mt-1 text-sm text-[#64748B]">Unselected supplier catalog products are no longer stored in Jimvio's database.</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <label htmlFor="cj-product-pid" className="block text-sm font-medium text-[#334155]">CJ Product ID (PID)</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="cj-product-pid"
              value={pid}
              onChange={(event) => setPid(event.target.value)}
              placeholder="Paste CJ product PID"
              autoComplete="off"
              maxLength={128}
              disabled={busy}
              className="h-12 min-w-0 flex-1 rounded-xl border border-[#D1D5DB] bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/15 disabled:bg-[#F8FAFC]"
            />
            <button
              type="submit"
              disabled={busy || !pid.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FF5A1F] px-5 text-sm font-semibold text-white transition hover:bg-[#E94D17] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {busy ? "Importing…" : "Import product"}
            </button>
          </div>
          <p className="text-xs text-[#94A3B8]">The import uses the authenticated admin API. Only products that CJ confirms are on sale can be imported.</p>
        </form>

        {error ? (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {result ? (
          <div role="status" aria-live="polite" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 font-semibold text-emerald-800">
              <CheckCircle2 className="h-5 w-5" /> Product imported successfully
            </div>
            <p className="mt-2 text-sm text-emerald-800">Product ID: <span className="font-mono">{result.productId}</span></p>
            <p className="mt-1 text-sm text-emerald-800">
              {result.variantsImported ?? 0} variants · {result.videosImported ?? 0} videos imported
            </p>
            {result.warning ? <p className="mt-2 text-sm text-amber-800">{result.warning}</p> : null}
            <Link href="/admin/products" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 underline">
              View products <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#64748B]" />
        <p className="text-xs leading-5 text-[#64748B]">
          Existing Marketplace products, orders, CJ product mappings, variants, inventory, shipping
          sync and webhook subscriptions are preserved. New products are imported only when you select
          their PID and request the import.
        </p>
      </div>
    </div>
  );
}
