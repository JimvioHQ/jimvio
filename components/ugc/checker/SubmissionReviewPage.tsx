"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CampaignCheckerPanel } from "@/components/ugc/verification/CampaignCheckerPanel";
import { SubmissionReviewDrawer } from "@/components/ugc/workspace/SubmissionReviewDrawer";
import { JoinRequestsPanel } from "./JoinRequestsPanel";

type Campaign = { id: string; title: string; status: string; submission_count?: number | null };

/**
 * Owner's review desk: every active campaign, every post checked by Jimvio,
 * with the money each one would cost and one click to approve or decline.
 */
export function SubmissionReviewPage() {
  const params = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [active, setActive] = useState<string>("");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch("/api/ugc/campaigns?mine=true&status=all&limit=50", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const list = ((Array.isArray(j?.data) ? j.data : []) as Campaign[]).filter((c) =>
          ["active", "paused", "completed"].includes(c.status),
        );
        setCampaigns(list);
        const wanted = params.get("campaign");
        setActive(list.find((c) => c.id === wanted)?.id ?? list.find((c) => c.status === "active")?.id ?? list[0]?.id ?? "");
      })
      .catch(() => setCampaigns([]));
  }, [params]);

  const done = useCallback(() => setReloadKey((k) => k + 1), []);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-1 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">
            <ClipboardCheck className="h-3.5 w-3.5" /> Submission Review
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-[#111827]">Review what creators posted</h1>
          <p className="text-[13.5px] text-[#6B7280]">
            Jimvio checks every post: real views, bots, AI and quality. You see what each post would cost, approve or decline, and decide who can join.
          </p>
        </div>
      </header>

      {campaigns == null ? (
        <Loader2 className="h-6 w-6 animate-spin text-[#FF5A1F]" />
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-8 text-center">
          <p className="text-[15px] font-bold text-[#111827]">No live campaigns yet</p>
          <p className="mt-1 text-[13px] text-[#6B7280]">Fund a campaign to go live. Creators' posts will show up here.</p>
          <Link
            href="/ugc/campaign-center/create"
            className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-[#FF5A1F] px-4 text-[13px] font-bold text-white"
          >
            <Plus className="h-4 w-4" /> Create campaign
          </Link>
        </div>
      ) : (
        <>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {campaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.id)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition",
                  active === c.id ? "border-[#111827] bg-[#111827] text-white" : "border-[#E5E7EB] bg-white text-[#374151] hover:border-[#9CA3AF]",
                )}
              >
                {c.title}
                {c.status !== "active" ? <span className="ml-1.5 text-[11px] font-medium opacity-70 capitalize">· {c.status}</span> : null}
              </button>
            ))}
          </div>
          {active ? <CampaignCheckerPanel key={`${active}-${reloadKey}`} campaignId={active} onOpen={setReviewId} /> : null}
          {active ? <JoinRequestsPanel key={`join-${active}`} campaignId={active} /> : null}
        </>
      )}

      {reviewId ? <SubmissionReviewDrawer id={reviewId} onClose={() => setReviewId(null)} onDone={done} /> : null}
    </div>
  );
}
