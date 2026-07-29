"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";

export default function CreatorRecruitmentPage() {
  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ugc/campaigns?status=all&limit=50&mine=true")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setCampaigns((j.data ?? []).filter((c: UGCCampaign) => c.status === "active" || c.status === "draft"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#FF5A1F]">
        Campaign Center
      </p>
      <h1 className="mt-1 text-[24px] font-bold tracking-tight text-[#111827] sm:text-[28px]">
        Creator Recruitment
      </h1>
      <p className="mt-1 text-[13px] text-[#6B7280]">
        Invite and manage creators applying to your campaigns.
      </p>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-[#F3F4F6]" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#E5E7EB] px-6 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-[#D1D5DB]" />
          <p className="mt-3 text-[14px] font-semibold text-[#111827]">No open campaigns</p>
          <Link
            href="/ugc/campaign-center/create"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-[#FF5A1F] px-4 text-[13px] font-bold text-white"
          >
            Create Campaign
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {campaigns.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EEF0F2] bg-white p-4"
            >
              <div>
                <p className="font-bold text-[#111827]">{c.title}</p>
                <p className="mt-0.5 text-[12px] text-[#6B7280]">
                  {c.approved_count ?? 0} approved · {c.submission_count ?? 0} submissions ·{" "}
                  <span className="capitalize">{c.status}</span>
                </p>
              </div>
              <Link
                href={`/dashboard/vendor/campaigns/${c.id}/applications`}
                className="inline-flex h-9 items-center rounded-full border border-[#E5E7EB] px-3 text-[12px] font-semibold text-[#374151] hover:bg-[#F9FAFB]"
              >
                Review applicants
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
