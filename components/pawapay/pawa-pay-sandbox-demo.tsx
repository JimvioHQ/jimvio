"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type DepositResponse = {
  ok?: boolean;
  error?: string;
  depositId?: string;
  status?: string;
  raw?: unknown;
};

/**
 * Minimal UI for testing POST /api/deposit against PawaPay sandbox (use with ngrok + /api/webhook).
 */
export function PawaPaySandboxDemo() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("100");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          amount: parseFloat(amount),
        }),
      });
      const data = (await res.json()) as DepositResponse;
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setSuccess(
        `Deposit accepted. status=${data.status ?? "?"} depositId=${data.depositId ?? "?"} — check your phone and server logs for /api/webhook.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">PawaPay sandbox (demo)</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Calls <code className="text-xs">POST /api/deposit</code> using <code className="text-xs">PAWAPAY_BASE_URL</code> and{" "}
        <code className="text-xs">PAWAPAY_API_TOKEN</code>. Use ngrok and register{" "}
        <code className="break-all text-xs">https://&lt;ngrok&gt;/api/webhook</code> in the PawaPay dashboard.
      </p>
      <div>
        <label className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Phone (Rwanda)</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="2507XXXXXXXX"
          className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          autoComplete="tel"
        />
      </div>
      <div>
        <label className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Amount (RWF)</label>
        <input
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Processing…" : "Pay now"}
      </Button>
      {error && (
        <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-[var(--color-text-primary)]">
          {success}
        </p>
      )}
    </form>
  );
}
