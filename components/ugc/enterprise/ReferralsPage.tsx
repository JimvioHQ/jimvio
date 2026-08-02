"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
  UGCStatusPill,
} from "@/components/ugc/workspace/UGCPageShell";
import { EnterprisePrimaryButton, MetricCard, cardClass } from "./enterprise-ui";

type ReferralCode = {
  id: string;
  code: string;
  uses?: number;
  reward_amount?: number;
  is_active?: boolean;
};

type Attribution = {
  id: string;
  status: string;
  reward_amount?: number | null;
  created_at?: string;
  referred_user_id?: string;
};

type LeaderboardRow = {
  code?: string;
  uses?: number;
  owner_user_id?: string;
  reward_amount?: number;
};

export function ReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<ReferralCode | null>(null);
  const [attributions, setAttributions] = useState<Attribution[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ugc/referrals", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load referrals");
      setCode(json.code ?? json.referralCode ?? null);
      setAttributions(json.attributions ?? json.data ?? []);
      setLeaderboard(json.leaderboard ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load referrals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ensureCode = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/ugc/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not create code");
      toast.success("Referral code ready");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create code");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!code?.code) return;
    try {
      await navigator.clipboard.writeText(code.code);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <UGCPageShell
      title="Referrals"
      subtitle="Share your code, track attributions, and climb the leaderboard."
      actions={
        <EnterprisePrimaryButton onClick={() => void ensureCode()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {code ? "Refresh code" : "Create code"}
        </EnterprisePrimaryButton>
      }
    >
      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Your code" value={code?.code ?? "—"} />
            <MetricCard label="Uses" value={code?.uses ?? 0} />
            <MetricCard label="Reward" value={code?.reward_amount ?? 5} />
          </div>

          {code ? (
            <div className={`${cardClass} flex flex-wrap items-center justify-between gap-3`}>
              <p className="text-sm text-[#374151]">
                Share code <span className="font-bold text-[#FF5A1F]">{code.code}</span>
              </p>
              <EnterprisePrimaryButton onClick={() => void copyCode()}>
                <Copy className="h-4 w-4" />
                Copy
              </EnterprisePrimaryButton>
            </div>
          ) : (
            <UGCPageEmpty title="No referral code" description="Create a code to start earning rewards." />
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-[#111827]">Attributions</h2>
              {attributions.length === 0 ? (
                <p className="text-[13px] text-[#6B7280]">No attributions yet.</p>
              ) : (
                attributions.map((a) => (
                  <div key={a.id} className={`${cardClass} flex items-center justify-between gap-2`}>
                    <div>
                      <p className="text-[12px] text-[#6B7280]">{a.referred_user_id}</p>
                      {a.created_at ? (
                        <p className="text-[11px] text-[#9CA3AF]">
                          {new Date(a.created_at).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                    <UGCStatusPill status={a.status} />
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-[#111827]">Leaderboard</h2>
              {leaderboard.length === 0 ? (
                <p className="text-[13px] text-[#6B7280]">Leaderboard will populate as codes are used.</p>
              ) : (
                leaderboard.slice(0, 20).map((row, i) => (
                  <div key={`${row.code}-${i}`} className={`${cardClass} flex items-center justify-between`}>
                    <p className="text-sm font-semibold text-[#111827]">
                      #{i + 1} {row.code}
                    </p>
                    <p className="text-sm font-bold text-[#FF5A1F]">{row.uses ?? 0} uses</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
