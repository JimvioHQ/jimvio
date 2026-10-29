"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { JoinEligibilityResult } from "@/lib/ugc/join-engine";
import type { CreatorProfileCompletion } from "@/lib/identity/creator-profile-completion";
import { ProgressBar } from "@/components/ugc/campaign-detail/campaign-detail-ui";
import { cn } from "@/lib/utils";
import {
  EligibilityDetails,
  type EligibilityCountry,
  type EligibilityCountryPolicy,
} from "./EligibilityDetails";

type Data = {
  eligibility: JoinEligibilityResult;
  profileCompletion: CreatorProfileCompletion | null;
  country: EligibilityCountry;
  countryPolicy: EligibilityCountryPolicy;
};

/** One page that explains every requirement for a campaign and how to fix each one. */
export function CampaignEligibilityView({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [title, setTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/ugc/campaigns/${campaignId}/eligibility`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/ugc/campaigns/${campaignId}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([e, c]) => {
        if (cancelled) return;
        if (!e?.eligibility) setError("Could not load eligibility for this campaign.");
        else setData(e as Data);
        setTitle(c?.campaign?.title ?? "");
      })
      .catch(() => !cancelled && setError("Could not load eligibility for this campaign."));
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <div className="border-b border-[#EEF0F2] bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center">
          <Link href={`/ugc/${campaignId}/join`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#6B7280]">
            <ArrowLeft className="h-4 w-4" /> Back to join
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Eligibility</p>
          <h1 className="mt-1 break-words text-xl font-bold text-[#111827]">{title || "Campaign"}</h1>
        </div>
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</p> : null}
        {!data && !error ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-[#FF5A1F]" />
          </div>
        ) : null}
        {data ? (
          <>
            <div className="rounded-[18px] border border-[#EEF0F2] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-[#FF5A1F]">{data.eligibility.score}%</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase",
                    data.eligibility.level === "eligible"
                      ? "bg-emerald-50 text-emerald-700"
                      : data.eligibility.level === "almost"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700",
                  )}
                >
                  {data.eligibility.level === "eligible"
                    ? "Eligible"
                    : data.eligibility.level === "almost"
                      ? "Almost"
                      : "Not eligible"}
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar value={data.eligibility.score} />
              </div>
              {data.eligibility.blocked && data.eligibility.blockReason ? (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{data.eligibility.blockReason}</p>
              ) : null}
            </div>
            <div className="rounded-[18px] border border-[#EEF0F2] bg-white p-5 shadow-sm">
              <EligibilityDetails
                eligibility={data.eligibility}
                profileCompletion={data.profileCompletion}
                country={data.country}
                countryPolicy={data.countryPolicy}
              />
            </div>
            <Link
              href={`/ugc/${campaignId}/join`}
              className="flex h-12 w-full items-center justify-center rounded-full bg-[#FF5A1F] text-[14px] font-bold text-white"
            >
              Back to join
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
