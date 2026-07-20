"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  slug: string;
  canTrial?: boolean;
};

export function MembershipActions({ slug, canTrial = true }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tiers, setTiers] = useState<Array<{ id: string; name: string; plan_type: string; trial_days: number }>>([]);

  useEffect(() => {
    void fetch(`/api/creator/memberships/${slug}?view=tiers`)
      .then((r) => r.json())
      .then((d) => setTiers(d.tiers ?? []))
      .catch(() => undefined);
  }, [slug]);

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/creator/memberships/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessage(
        action === "cancel"
          ? "Subscription cancellation scheduled."
          : action === "start_trial"
            ? "Trial started."
            : "Plan updated."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const trialTier = tiers.filter((t) => t.trial_days > 0);

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Manage membership</h3>
      <div className="flex flex-wrap gap-2">
        {canTrial && trialTier.length > 0 && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void run("start_trial", { tierId: trialTier[0].id })}
            className="rounded-xl bg-[#fd5000] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {busy === "start_trial" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Start trial"}
          </button>
        )}
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void run("change_plan", { planType: "monthly" })}
          className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-semibold disabled:opacity-50"
        >
          Switch to monthly
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void run("change_plan", { planType: "yearly" })}
          className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-semibold disabled:opacity-50"
        >
          Upgrade to annual
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void run("cancel", { immediate: false })}
          className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
        >
          Cancel subscription
        </button>
      </div>
      {message && <p className="text-xs text-emerald-700">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
