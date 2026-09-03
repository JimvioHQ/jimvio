"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import {
  buildCampaignDayInfo,
  lifecycleLabel,
  scheduleKindLabel,
  type CampaignScheduleEvent,
} from "@/lib/ugc/campaign-schedule";
import { getCampaignRewardLine } from "./ugc-campaign-utils";
import { cn } from "@/lib/utils";

export function UGCDateDetailPanel({
  dateLabel,
  dateKey,
  campaigns,
  eventsByCampaign,
  onClose,
}: {
  dateLabel: string;
  dateKey: string;
  campaigns: UGCCampaign[];
  eventsByCampaign: Record<string, CampaignScheduleEvent[]>;
  onClose: () => void;
}) {
  const { formatMoney } = useCurrency();

  return (
    <aside className="rounded-[16px] border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_30px_rgba(17,24,39,0.06)] sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
            Campaign day
          </p>
          <h2 className="mt-0.5 text-[18px] font-bold tracking-tight text-[#111827]">{dateLabel}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close date details"
          className="grid h-9 w-9 place-items-center rounded-full text-[#64748B] hover:bg-[#F8FAFC]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {campaigns.length === 0 ? (
        <p className="text-[13px] text-[#64748B]">No campaign events on this date.</p>
      ) : (
        <div className="space-y-5">
          {campaigns.map((campaign) => {
            const info = buildCampaignDayInfo({
              dateKey,
              campaign,
              events: eventsByCampaign[campaign.id] ?? [],
            });
            const reward = getCampaignRewardLine(campaign, formatMoney);
            return (
              <article key={campaign.id} className="rounded-[14px] border border-[#EEF0F2] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[12px] font-semibold text-[#64748B]">{info.campaign.brand}</p>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      info.lifecycle === "live"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : info.lifecycle === "ending_soon"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : info.lifecycle === "ended"
                            ? "border-[#E5E7EB] bg-[#F8FAFC] text-[#64748B]"
                            : "border-sky-200 bg-sky-50 text-sky-700",
                    )}
                  >
                    {lifecycleLabel(info.lifecycle)}
                  </span>
                </div>
                <h3 className="mt-1 text-[16px] font-bold text-[#111827]">{campaign.title}</h3>

                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                    What happens today
                  </p>
                  {info.whatHappens.length === 0 ? (
                    <p className="mt-1 text-[13px] text-[#64748B]">No specific milestone on this date.</p>
                  ) : (
                    <ul className="mt-1.5 space-y-1">
                      {info.whatHappens.map((event) => (
                        <li key={event.id} className="text-[13px] text-[#111827]">
                          <span className="font-semibold">{scheduleKindLabel(event.kind)}</span>
                          {event.description ? (
                            <span className="text-[#64748B]"> — {event.description}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
                  <InfoBlock label="Reward" value={reward} />
                  <InfoBlock
                    label="Platforms"
                    value={info.campaign.platforms.map((p) => (p === "x" ? "X" : p)).join(" · ") || "—"}
                  />
                  <InfoBlock
                    label="Content"
                    value={
                      [
                        info.campaign.requirements.min_duration || info.campaign.requirements.max_duration
                          ? `${info.campaign.requirements.min_duration ?? 0}–${info.campaign.requirements.max_duration ?? "∞"}s`
                          : "Flexible length",
                        info.campaign.requirements.requires_face ? "On-camera required" : "Face optional",
                      ].join(" · ")
                    }
                  />
                  <InfoBlock label="Campaign owner" value={info.campaign.brand} />
                  <InfoBlock
                    label="Hashtags"
                    value={info.campaign.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ") || "None"}
                  />
                  <InfoBlock
                    label="Mentions"
                    value={info.campaign.mentions.map((m) => `@${m.replace(/^@/, "")}`).join(" ") || "None"}
                  />
                </div>

                {campaign.description ? (
                  <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-[#4B5563]">
                    {campaign.description}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/ugc/${campaign.id}`}
                    className="inline-flex h-10 items-center rounded-full bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white hover:bg-[#E54E18]"
                  >
                    View brief
                  </Link>
                  <Link
                    href={`/ugc/${campaign.id}/submit`}
                    className="inline-flex h-10 items-center rounded-full border border-[#E5E7EB] px-4 text-[13px] font-semibold text-[#111827] hover:bg-[#F8FAFC]"
                  >
                    Submit content
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</p>
      <p className="mt-0.5 text-[#111827]">{value}</p>
    </div>
  );
}
