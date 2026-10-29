"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, UserPlus, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Participant = {
  id: string;
  status: string;
  joined_at: string | null;
  application_message: string | null;
  eligibility_score: number | null;
  influencer: {
    id: string;
    display_name: string | null;
    profile_image: string | null;
    total_followers: number | null;
    engagement_rate: number | null;
    is_verified: boolean | null;
  } | null;
};

type JoinMode = "instant" | "application" | "invite_only" | "hybrid";

/**
 * Owner controls for who can join one campaign, and the creators waiting
 * for a yes or no when the campaign is "by request".
 */
export function JoinRequestsPanel({ campaignId }: { campaignId: string }) {
  const [mode, setMode] = useState<JoinMode | null>(null);
  const [rows, setRows] = useState<Participant[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([
      fetch(`/api/ugc/campaigns/${campaignId}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/ugc/campaigns/${campaignId}/participants?status=pending`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ]);
    const campaign = (c?.campaign ?? c?.data ?? c) as { join_mode?: JoinMode } | null;
    setMode((campaign?.join_mode as JoinMode) ?? "instant");
    setRows((p?.data ?? []) as Participant[]);
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeMode(next: JoinMode) {
    if (next === mode) return;
    setBusy("mode");
    setError(null);
    const res = await fetch(`/api/ugc/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ join_mode: next }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(json.error || "Could not change who can join.");
    setMode(next);
  }

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/ugc/campaigns/${campaignId}/participants`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: id, action }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(json.error || "Could not save your decision.");
    setRows((r) => (r ?? []).filter((x) => x.id !== id));
  }

  const byRequest = mode === "application" || mode === "hybrid";

  return (
    <section aria-label="Join requests" className="space-y-3 rounded-2xl border border-[#EEF0F2] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Users className="h-5 w-5 text-[#FF5A1F]" aria-hidden="true" />
        <h2 className="text-[15px] font-bold text-[#111827]">Who can join</h2>
        {rows && rows.length > 0 ? (
          <span className="rounded-full bg-[#FF5A1F] px-2 py-0.5 text-[11px] font-bold text-white">{rows.length} waiting</span>
        ) : null}
        <div className="ml-auto inline-flex rounded-full bg-[#F3F4F6] p-0.5" role="radiogroup" aria-label="Join method">
          {(
            [
              ["instant", "Open to all"],
              ["application", "By request"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={m === "application" ? byRequest : mode === m}
              disabled={busy === "mode" || mode == null}
              onClick={() => void changeMode(m)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
                (m === "application" ? byRequest : mode === m) ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[12px] text-[#6B7280]">
        {mode === "invite_only"
          ? "Invite only: creators can join only when you invite them."
          : byRequest
            ? "Creators ask to join. You approve who can post for this campaign."
            : "Any eligible creator can join right away."}
      </p>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p> : null}

      {rows == null ? (
        <Loader2 className="h-5 w-5 animate-spin text-[#FF5A1F]" />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E5E7EB] p-4 text-center text-[12.5px] text-[#6B7280]">
          {byRequest ? "No join requests waiting." : "No requests: creators join this campaign directly."}
        </p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#F3F4F6] p-3">
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#F3F4F6]">
                {p.influencer?.profile_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.influencer.profile_image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserPlus className="m-2.5 h-5 w-5 text-[#9CA3AF]" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold text-[#111827]">{p.influencer?.display_name ?? "Creator"}</p>
                <p className="text-[11.5px] text-[#6B7280]">
                  {p.influencer?.total_followers != null ? `${Number(p.influencer.total_followers).toLocaleString("en-US")} followers · ` : ""}
                  {p.eligibility_score != null ? `Fit score ${p.eligibility_score} · ` : ""}
                  {p.joined_at ? `asked ${new Date(p.joined_at).toLocaleDateString()}` : ""}
                </p>
                {p.application_message ? <p className="mt-1 text-[12px] text-[#374151]">“{p.application_message}”</p> : null}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => void decide(p.id, "approve")}
                  className="inline-flex h-9 items-center gap-1 rounded-full bg-emerald-600 px-3.5 text-[12.5px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
                </button>
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => void decide(p.id, "reject")}
                  className="inline-flex h-9 items-center gap-1 rounded-full border border-[#E5E7EB] px-3.5 text-[12.5px] font-semibold text-[#374151] hover:border-rose-300 hover:text-rose-700 disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5" /> Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
