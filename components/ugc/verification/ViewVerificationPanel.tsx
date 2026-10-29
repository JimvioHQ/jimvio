"use client";

import { useState } from "react";
import { BadgeCheck, AlertTriangle, Link2, Loader2, RefreshCw, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { FLAG_LABELS, type VerificationFlag } from "@/lib/ugc/verification/signals";

export type VerificationFields = {
  id: string;
  platform: string;
  verification_status?: string | null;
  verification_note?: string | null;
  verification_flags?: string[] | null;
  verification_checked_at?: string | null;
  baseline_views?: number | null;
  latest_views?: number | null;
  verified_views?: number | null;
};

function fmt(value: number | null | undefined): string {
  return value == null ? "—" : Number(value).toLocaleString("en-US");
}

function ago(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

const CONNECT_PLATFORMS: Record<string, string> = { youtube: "YouTube", tiktok: "TikTok" };

/**
 * Shows what the platform API confirmed for one post. Used by brands in review
 * and by creators on their submissions.
 */
export function ViewVerificationPanel({
  submission,
  viewer,
  onChecked,
}: {
  submission: VerificationFields;
  viewer: "brand" | "creator";
  onChecked?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const status = submission.verification_status ?? "unverified";
  const flags = (submission.verification_flags ?? []) as VerificationFlag[];
  const gained =
    submission.latest_views != null && submission.baseline_views != null
      ? Math.max(0, submission.latest_views - submission.baseline_views)
      : null;
  const connectLabel = CONNECT_PLATFORMS[submission.platform];
  const returnPath = typeof window !== "undefined" ? window.location.pathname : "/ugc/submissions";

  async function recheck() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/ugc/submissions/${submission.id}/verify-views`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setMessage(json.error || "Could not check views right now.");
      else setMessage(json.outcome?.note ?? "Checked.");
      onChecked?.();
    } finally {
      setBusy(false);
    }
  }

  const verified = status === "verified";
  const tone = verified
    ? flags.length
      ? "border-amber-200 bg-amber-50"
      : "border-emerald-200 bg-emerald-50"
    : "border-[#E5E7EB] bg-[#F9FAFB]";

  return (
    <section className={cn("rounded-xl border p-3 text-[13px]", tone)} aria-label="Real view verification">
      <div className="flex items-center gap-2">
        {verified && !flags.length ? (
          <BadgeCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        ) : verified ? (
          <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
        ) : (
          <ShieldQuestion className="h-4 w-4 text-[#6B7280]" aria-hidden="true" />
        )}
        <p className="font-semibold text-[#111827]">
          {verified
            ? flags.length
              ? "Verified — on hold for a manual check"
              : "Real views verified"
            : status === "unsupported"
              ? "Manual review"
              : "Not verified yet"}
        </p>
        <button
          type="button"
          onClick={() => void recheck()}
          disabled={busy || status === "unsupported"}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-2 py-1 text-[11px] font-semibold text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Check now
        </button>
      </div>

      {verified ? (
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-white/70 p-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">At submission</dt>
            <dd className="mt-0.5 font-bold tabular-nums text-[#111827]">{fmt(submission.baseline_views)}</dd>
          </div>
          <div className="rounded-lg bg-white/70 p-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">Now</dt>
            <dd className="mt-0.5 font-bold tabular-nums text-[#111827]">{fmt(submission.latest_views)}</dd>
          </div>
          <div className="rounded-lg bg-white/70 p-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">Gained</dt>
            <dd className="mt-0.5 font-bold tabular-nums text-emerald-700">{fmt(gained)}</dd>
          </div>
        </dl>
      ) : null}

      {submission.verification_note ? (
        <p className="mt-2 text-[12px] text-[#4B5563]">{submission.verification_note}</p>
      ) : status === "unverified" ? (
        <p className="mt-2 text-[12px] text-[#4B5563]">
          Jimvio reads views from the platform’s official API on the creator’s own connected account.
        </p>
      ) : null}

      {flags.length ? (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[12px] text-amber-800">
          {flags.map((f) => (
            <li key={f}>{FLAG_LABELS[f] ?? f}</li>
          ))}
        </ul>
      ) : null}

      {viewer === "creator" && connectLabel && (status === "needs_connection" || status === "needs_permission") ? (
        <a
          href={`/api/integrations/${submission.platform}/start?return=${encodeURIComponent(returnPath)}`}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#FF5A1F] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          Connect {connectLabel}
        </a>
      ) : null}

      <p className="mt-2 text-[11px] text-[#9CA3AF]">
        {submission.verification_checked_at ? `Last checked ${ago(submission.verification_checked_at)}. ` : ""}
        {viewer === "brand"
          ? "Only views gained after submission can be accepted for payment."
          : "Only views gained after you submit are paid."}
      </p>
      {message ? <p className="mt-1 text-[12px] font-medium text-[#374151]" role="status">{message}</p> : null}
    </section>
  );
}
