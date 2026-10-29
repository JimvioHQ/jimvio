"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Info, Link2, Loader2, XCircle } from "lucide-react";

type Result =
  | { ok: true; verifiable: true; account: string | null; views: number }
  | { ok: true; verifiable: false; note: string }
  | { ok: false; reason: string; message: string; connect?: "youtube" | "tiktok" | null; account?: string | null };

/**
 * Checks the pasted link while the creator types: is this video on their own
 * connected account? Blocks the submit when it clearly isn't.
 */
export function PostOwnershipCheck({
  platform,
  url,
  onBlockedChange,
}: {
  platform: string;
  url: string;
  onBlockedChange: (blocked: boolean) => void;
}) {
  const [state, setState] = useState<{ loading: boolean; result: Result | null }>({ loading: false, result: null });

  useEffect(() => {
    const link = url.trim();
    if (!platform || link.length < 12) {
      setState({ loading: false, result: null });
      onBlockedChange(false);
      return;
    }
    let cancelled = false;
    setState({ loading: true, result: null });
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/ugc/submissions/precheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, post_url: link }),
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const result = (json.result ?? null) as Result | null;
        setState({ loading: false, result });
        onBlockedChange(Boolean(result && !result.ok));
      } catch {
        if (!cancelled) {
          setState({ loading: false, result: null });
          onBlockedChange(false);
        }
      }
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, url]);

  if (state.loading) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-[12.5px] text-[#4B5563]">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF5A1F]" /> Checking this video is yours…
      </p>
    );
  }
  const r = state.result;
  if (!r) return null;
  if (r.ok && r.verifiable) {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Yours — found on your connected channel{r.account ? ` (${r.account})` : ""}. It has {r.views.toLocaleString("en-US")} views now;
          only views after you submit are paid.
        </span>
      </p>
    );
  }
  if (r.ok) {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-[12.5px] text-[#4B5563]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /> {r.note}
      </p>
    );
  }
  const back = typeof window !== "undefined" ? window.location.pathname : "/ugc";
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12.5px] text-rose-800">
      <p className="flex items-start gap-2">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {r.message}
      </p>
      {r.connect ? (
        <a
          href={`/api/integrations/${r.connect}/start?return=${encodeURIComponent(back)}`}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#FF5A1F] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
        >
          <Link2 className="h-3.5 w-3.5" /> {r.reason === "not_yours" ? "Connect the right account" : `Connect ${r.connect === "youtube" ? "YouTube" : "TikTok"}`}
        </a>
      ) : null}
    </div>
  );
}
