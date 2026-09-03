"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Download,
  ExternalLink,
  Play,
  Shield,
} from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { UGCPremiumCampaignCard } from "@/components/ugc/workspace/UGCPremiumCampaignCard";
import { UGCPlatformMarks } from "@/components/ugc/workspace/UGCPlatformMarks";
import {
  buildEligibility,
  buildFaqs,
  buildResources,
  buildTimeline,
  getAspectRatioForPlatform,
  getCampaignCategory,
  getRewardType,
  type CreatorProfileSnapshot,
} from "@/lib/ugc/campaign-detail";
import { getCampaignRewardLine } from "@/components/ugc/workspace/ugc-campaign-utils";
import { localDateKey, parseCalendarDate } from "@/lib/ugc/calendar";
import { UGCDateDetailPanel } from "@/components/ugc/workspace/UGCDateDetailPanel";
import { buildCampaignSchedule } from "@/lib/ugc/campaign-schedule";
import {
  AccordionItem,
  ChecklistItem,
  MetricTile,
  Pill,
  SectionCard,
  SectionTitle,
} from "./campaign-detail-ui";

type CampaignDetailSectionsProps = {
  campaign: UGCCampaign;
  profile: CreatorProfileSnapshot | null;
  similar: UGCCampaign[];
};

export function CampaignDetailSections({ campaign, profile, similar }: CampaignDetailSectionsProps) {
  const { formatMoney } = useCurrency();
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const rewardType = getRewardType(campaign);
  const eligibility = buildEligibility(campaign, profile);
  const timeline = buildTimeline(campaign);
  const resources = buildResources(campaign);
  const faqs = buildFaqs(campaign);
  const scheduleEvents = buildCampaignSchedule(campaign);

  const desc = campaign.description ?? "";
  const descLong = desc.length > 320;
  const rewardLine = getCampaignRewardLine(campaign, formatMoney);

  return (
    <div className="space-y-4 sm:space-y-5">
      <SectionCard id="about">
        <SectionTitle>About this campaign</SectionTitle>
        {desc ? (
          <>
            <p
              className={`text-[14px] leading-relaxed text-[#4B5563] whitespace-pre-line ${
                !expandedDesc && descLong ? "line-clamp-5" : ""
              }`}
            >
              {desc}
            </p>
            {descLong ? (
              <button
                type="button"
                onClick={() => setExpandedDesc((e) => !e)}
                className="mt-2 text-[12px] font-semibold text-[#FF5A1F]"
              >
                {expandedDesc ? "Show less" : "Read full description"}
              </button>
            ) : null}
          </>
        ) : (
          <p className="text-[13px] text-[#9CA3AF]">No extended description provided.</p>
        )}
      </SectionCard>

      <SectionCard id="reward">
        <SectionTitle>Compensation</SectionTitle>
        <div className="mb-3 flex flex-wrap gap-2">
          <Pill tone="brand">{rewardType}</Pill>
          <Pill tone="neutral">{getCampaignCategory(campaign)}</Pill>
        </div>
        <p className="text-[22px] font-bold tabular-nums text-[#111827]">{rewardLine}</p>
        {campaign.max_payout_per_sub ? (
          <p className="mt-1 text-[13px] text-[#64748B]">
            Cap per submission: {formatMoney(campaign.max_payout_per_sub, "USD")}
          </p>
        ) : null}
      </SectionCard>

      <SectionCard id="eligibility">
        <SectionTitle sub="See if you qualify before applying">Creator eligibility</SectionTitle>
        <div className="mb-4 flex items-center gap-3">
          <div className="text-[32px] font-bold tabular-nums text-[#FF5A1F]">{eligibility.score}%</div>
          <Pill
            tone={
              eligibility.level === "eligible"
                ? "success"
                : eligibility.level === "almost"
                  ? "warning"
                  : "danger"
            }
          >
            {eligibility.level === "eligible"
              ? "Eligible"
              : eligibility.level === "almost"
                ? "Almost eligible"
                : "Not eligible"}
          </Pill>
        </div>
        <div className="divide-y divide-[#EEF0F2]">
          {eligibility.requirements.map((r) => (
            <ChecklistItem key={r.id} label={r.label} met={r.met} detail={r.detail} />
          ))}
          <ChecklistItem
            label="Followers"
            met={!profile?.hasProfile || (profile.totalFollowers ?? 0) >= 0}
            detail={
              profile?.totalFollowers != null
                ? `${profile.totalFollowers.toLocaleString()} followers`
                : "No minimum disclosed"
            }
          />
          <ChecklistItem
            label="Category match"
            met={
              !profile?.niche?.length ||
              profile.niche.some((n) =>
                getCampaignCategory(campaign).toLowerCase().includes(n.toLowerCase()),
              )
            }
            detail={profile?.niche?.join(", ") || "Open to all niches"}
          />
          <ChecklistItem
            label="Account age"
            met={!profile?.accountAgeDays || profile.accountAgeDays >= 7}
            detail={
              profile?.accountAgeDays != null
                ? `${profile.accountAgeDays} days on Jimvio`
                : "Sign in to evaluate"
            }
          />
        </div>
      </SectionCard>

      <SectionCard id="requirements">
        <SectionTitle>Content requirements</SectionTitle>
        <div className="grid gap-1 sm:grid-cols-2">
          <ChecklistItem
            label="Video length"
            met={Boolean(campaign.min_duration || campaign.max_duration)}
            detail={
              campaign.min_duration || campaign.max_duration
                ? `${campaign.min_duration ?? 0}s – ${campaign.max_duration ?? "∞"}s`
                : "Flexible"
            }
          />
          <ChecklistItem
            label="Face on camera"
            met={!campaign.requires_face}
            detail={campaign.requires_face ? "On-camera required" : "Not required"}
          />
          <ChecklistItem
            label="Platforms"
            met={(campaign.allowed_platforms ?? []).length > 0}
            detail={
              (campaign.allowed_platforms ?? []).length > 0 ? (
                <UGCPlatformMarks platforms={campaign.allowed_platforms ?? []} />
              ) : (
                "Any approved platform"
              )
            }
          />
        </div>
        {(campaign.required_hashtags?.length ?? 0) > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Hashtags</p>
            <div className="flex flex-wrap gap-1.5">
              {campaign.required_hashtags.map((h) => (
                <span key={h} className="rounded-lg bg-[#FFF4EF] px-2 py-1 text-[11px] font-semibold text-[#FF5A1F]">
                  {h.startsWith("#") ? h : `#${h}`}
                </span>
              ))}
            </div>
          </div>
        )}
        {(campaign.required_mentions?.length ?? 0) > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Brand mentions</p>
            <div className="flex flex-wrap gap-1.5">
              {campaign.required_mentions.map((m) => (
                <span key={m} className="rounded-lg bg-[#F3F4F6] px-2 py-1 text-[11px] font-semibold text-[#374151]">
                  @{m.replace(/^@/, "")}
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Section 7 — Resources */}
      <SectionCard id="resources">
        <SectionTitle sub="Download and preview brand assets">Resources</SectionTitle>
        {resources.length === 0 ? (
          <p className="text-[13px] text-[#9CA3AF]">No resources uploaded yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {resources.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-[12px] border border-[#EEF0F2] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#111827]">{r.label}</p>
                  <p className="text-[11px] text-[#9CA3AF]">{r.source}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {r.previewable ? (
                    <button
                      type="button"
                      onClick={() => setPreviewUrl(r.url)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-[#E5E7EB]"
                      aria-label={`Preview ${r.label}`}
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[#E5E7EB]"
                    aria-label={`Open ${r.label}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
        {previewUrl ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="relative max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-black">
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="absolute right-3 top-3 z-10 rounded-full bg-black/50 px-3 py-1 text-xs text-white"
              >
                Close
              </button>
              {/\.(mp4|webm|mov)/i.test(previewUrl) ? (
                <video src={previewUrl} controls className="max-h-[80vh] w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview" className="max-h-[80vh] w-full object-contain" />
              )}
            </div>
          </div>
        ) : null}
      </SectionCard>

      {/* Section 8 — Deliverables */}
      <SectionCard id="deliverables">
        <SectionTitle>Deliverables</SectionTitle>
        <div className="space-y-2">
          {(campaign.allowed_platforms ?? []).length === 0 ? (
            <p className="text-[13px] text-[#6B7280]">Publish on any approved campaign platform.</p>
          ) : null}
          {(campaign.allowed_platforms ?? []).map((platform) => (
            <div key={platform} className="rounded-[12px] border border-[#EEF0F2] p-3">
              <div className="flex items-center gap-2">
                <UGCPlatformMarks platforms={[platform]} />
                <p className="text-[13px] font-semibold capitalize text-[#111827]">{platform}</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-[#6B7280]">
                <span>Aspect: {getAspectRatioForPlatform(platform)}</span>
                <span>
                  Duration: {campaign.min_duration ?? "—"}s – {campaign.max_duration ?? "—"}s
                </span>
                <span>Deadline: {campaign.ends_at ? new Date(campaign.ends_at).toLocaleDateString() : "TBD"}</span>
                <span>Quality: HD, native upload</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Section 9 — Timeline */}
      <SectionCard id="timeline">
        <SectionTitle sub="Click a date to see the full campaign brief">Campaign timeline</SectionTitle>
        <ol className="space-y-2">
          {timeline.map((e) => {
            const parsed = e.date ? parseCalendarDate(e.date) : null;
            const key = parsed ? localDateKey(parsed) : null;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  disabled={!key}
                  onClick={() => key && setSelectedDate(key)}
                  className="flex w-full gap-3 rounded-[12px] px-2 py-2 text-left hover:bg-[#F8FAFC] disabled:hover:bg-transparent"
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      e.status === "done"
                        ? "bg-emerald-500"
                        : e.status === "current"
                          ? "bg-[#FF5A1F]"
                          : "bg-[#D1D5DB]"
                    }`}
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-[#111827]">{e.label}</p>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {e.date ? new Date(e.date).toLocaleString() : "TBD"}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
        {selectedDate ? (
          <div className="mt-4">
            <UGCDateDetailPanel
              dateKey={selectedDate}
              dateLabel={new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              campaigns={[campaign]}
              eventsByCampaign={{ [campaign.id]: scheduleEvents }}
              onClose={() => setSelectedDate(null)}
            />
          </div>
        ) : null}
      </SectionCard>

      {/* Section 10 — FAQ */}
      <SectionCard id="faq">
        <SectionTitle>Frequently asked questions</SectionTitle>
        {faqs.map((f) => (
          <AccordionItem key={f.q} q={f.q} a={f.a} />
        ))}
      </SectionCard>

      {/* Section 11 — Brand */}
      <SectionCard id="brand">
        <SectionTitle>Brand information</SectionTitle>
        <div className="flex gap-3">
          {campaign.vendor?.business_logo ? (
            <Image
              src={campaign.vendor.business_logo}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 rounded-xl object-cover"
            />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#FFF4EF] text-lg font-bold text-[#FF5A1F]">
              {campaign.vendor?.business_name?.[0] ?? "B"}
            </div>
          )}
          <div>
            <p className="flex items-center gap-1.5 text-[15px] font-bold text-[#111827]">
              {campaign.vendor?.business_name}
              <Shield className="h-3.5 w-3.5 text-sky-500" />
            </p>
            <p className="text-[12px] text-[#6B7280]">
              {campaign.vendor?.business_type ?? "Creator brand"} ·{" "}
              {campaign.vendor?.business_country ?? "Global"}
            </p>
          </div>
        </div>
        {campaign.vendor?.business_description ? (
          <p className="mt-3 text-[13px] leading-relaxed text-[#4B5563]">
            {campaign.vendor.business_description}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricTile
            label="Member since"
            value={
              campaign.vendor?.created_at
                ? new Date(campaign.vendor.created_at).getFullYear().toString()
                : "—"
            }
          />
          <MetricTile
            label="Rating"
            value={campaign.vendor?.rating ? `${campaign.vendor.rating.toFixed(1)} ★` : "New"}
          />
          <MetricTile
            label="Approved"
            value={String(campaign.approved_count ?? 0)}
          />
          <MetricTile label="Followers" value={(campaign.vendor?.follower_count ?? 0).toLocaleString()} />
        </div>
        {campaign.vendor?.business_slug ? (
          <Link
            href={`/vendors/${campaign.vendor.business_slug}`}
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[#FF5A1F]"
          >
            View brand store <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </SectionCard>

      {/* Content examples */}
      <SectionCard id="examples">
        <SectionTitle sub="Reference style and brand tone">Content examples</SectionTitle>
        {resources.filter((r) => r.previewable).length === 0 ? (
          <p className="text-[13px] text-[#6B7280]">
            Follow the brief above. Brand example assets will appear here when uploaded.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {resources
              .filter((r) => r.previewable)
              .slice(0, 6)
              .map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setPreviewUrl(r.url)}
                  className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-[#EEF0F2] bg-[#F3F4F6]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.url}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                  />
                  <span className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/25">
                    <Play className="h-8 w-8 text-white opacity-0 drop-shadow transition group-hover:opacity-100" />
                  </span>
                </button>
              ))}
          </div>
        )}
      </SectionCard>

      {/* Creator tips */}
      <SectionCard id="tips">
        <SectionTitle>Creator tips</SectionTitle>
        <ul className="space-y-2 text-[13px] text-[#4B5563]">
          {[
            "Hook viewers in the first 2 seconds with motion or a clear promise.",
            "Keep captions on-screen — most views are sound-off.",
            "Use required hashtags and mentions exactly as listed.",
            "Submit native platform posts (not reuploads) for better reach tracking.",
            "Review brand resources before filming to match product framing.",
          ].map((tip) => (
            <li
              key={tip}
              className="rounded-xl border border-[#EEF0F2] bg-[#FAFAFA] px-3 py-2.5 leading-relaxed"
            >
              {tip}
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Brand contact */}
      <SectionCard id="contact">
        <SectionTitle sub="If enabled by the brand">Brand contact</SectionTitle>
        <p className="text-[13px] leading-relaxed text-[#6B7280]">
          After you join, message the brand from your active project for clarifications.
          Public contact details are only shown when the brand enables them.
        </p>
        {campaign.vendor?.business_slug ? (
          <Link
            href={`/vendors/${campaign.vendor.business_slug}`}
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[#FF5A1F]"
          >
            Visit brand page <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </SectionCard>

      {similar.length > 0 ? (
        <SectionCard id="similar">
          <SectionTitle sub="Recommended for you">Similar campaigns</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {similar.map((c, i) => (
              <UGCPremiumCampaignCard key={c.id} campaign={c} index={i} />
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
