"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  Play,
  Shield,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { UGCPremiumCampaignCard } from "@/components/ugc/workspace/UGCPremiumCampaignCard";
import {
  buildEligibility,
  buildFaqs,
  buildInsights,
  buildResources,
  buildTimeline,
  estimateEarnings,
  getAspectRatioForPlatform,
  getCampaignCategory,
  getRejectedEstimate,
  getRemainingBudget,
  getReservedBudget,
  getRewardType,
  type CreatorProfileSnapshot,
} from "@/lib/ugc/campaign-detail";
import {
  AccordionItem,
  ChecklistItem,
  MetricTile,
  Pill,
  ProgressBar,
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
  const [calc, setCalc] = useState({ views: 10000, sales: 1, clicks: 500, conversions: 5 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const rewardType = getRewardType(campaign);
  const eligibility = buildEligibility(campaign, profile);
  const insights = buildInsights(campaign);
  const timeline = buildTimeline(campaign);
  const resources = buildResources(campaign);
  const faqs = buildFaqs(campaign);
  const estimated = useMemo(() => estimateEarnings(campaign, calc), [campaign, calc]);

  const remaining = getRemainingBudget(campaign);
  const reserved = getReservedBudget(campaign);
  const rejected = getRejectedEstimate(campaign);
  const budgetPct = Math.min(100, ((campaign.spent_budget ?? 0) / (campaign.total_budget || 1)) * 100);

  const desc = campaign.description ?? "";
  const descLong = desc.length > 320;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Section 2 — Reward */}
      <SectionCard id="reward">
        <SectionTitle sub="Estimate your potential earnings">Reward overview</SectionTitle>
        <div className="mb-4 flex flex-wrap gap-2">
          <Pill tone="brand">{rewardType}</Pill>
          <Pill tone="neutral">{getCampaignCategory(campaign)}</Pill>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold text-[#6B7280]">Estimated views</span>
            <input
              type="number"
              min={0}
              value={calc.views}
              onChange={(e) => setCalc((c) => ({ ...c, views: Number(e.target.value) || 0 }))}
              className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-[#6B7280]">Estimated sales</span>
            <input
              type="number"
              min={0}
              value={calc.sales}
              onChange={(e) => setCalc((c) => ({ ...c, sales: Number(e.target.value) || 0 }))}
              className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-[#6B7280]">Estimated clicks</span>
            <input
              type="number"
              min={0}
              value={calc.clicks}
              onChange={(e) => setCalc((c) => ({ ...c, clicks: Number(e.target.value) || 0 }))}
              className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-[#6B7280]">Estimated conversions</span>
            <input
              type="number"
              min={0}
              value={calc.conversions}
              onChange={(e) => setCalc((c) => ({ ...c, conversions: Number(e.target.value) || 0 }))}
              className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-4 rounded-[12px] border border-[#FFE4D6] bg-[#FFF8F5] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#FF5A1F]">
            Estimated earnings
          </p>
          <p className="mt-1 text-[28px] font-bold tabular-nums text-[#111827]">
            {formatMoney(estimated, "USD")}
          </p>
          <p className="text-[12px] text-[#6B7280]">
            Cap per submission: {formatMoney(campaign.max_payout_per_sub ?? 400, "USD")}
          </p>
        </div>
      </SectionCard>

      {/* Section 3 — Budget */}
      <SectionCard id="budget">
        <SectionTitle sub="Live campaign funding status">Budget</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricTile label="Total" value={formatMoney(campaign.total_budget, "USD")} />
          <MetricTile label="Remaining" value={formatMoney(remaining, "USD")} />
          <MetricTile label="Paid out" value={formatMoney(campaign.spent_budget ?? 0, "USD")} />
          <MetricTile label="Reserved" value={formatMoney(reserved, "USD")} />
        </div>
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-[12px] font-semibold text-[#374151]">
            <span>Campaign progress</span>
            <span>{Math.round(budgetPct)}% allocated</span>
          </div>
          <ProgressBar value={budgetPct} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricTile label="Creators joined" value={String(campaign.submission_count ?? 0)} />
          <MetricTile label="Applications" value={String(campaign.submission_count ?? 0)} />
          <MetricTile label="Approved" value={String(campaign.approved_count ?? 0)} />
          <MetricTile label="Active creators" value={String(Math.max(0, (campaign.submission_count ?? 0) - rejected))} />
          <MetricTile label="Rejected est." value={String(rejected)} />
          <MetricTile label="Views tracked" value={(campaign.total_views_tracked ?? 0).toLocaleString()} />
        </div>
      </SectionCard>

      {/* Section 4 — Eligibility */}
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
            label="Language"
            met
            detail="English (campaign default)"
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

      {/* Section 5 — Overview */}
      <SectionCard id="overview">
        <SectionTitle>Campaign overview</SectionTitle>
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
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[12px] bg-[#FAFAFA] p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Objectives</p>
            <p className="mt-1 text-[13px] text-[#374151]">
              Drive authentic {getCampaignCategory(campaign).toLowerCase()} content on{" "}
              {(campaign.allowed_platforms ?? []).join(", ") || "social platforms"}.
            </p>
          </div>
          <div className="rounded-[12px] bg-[#FAFAFA] p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Success metrics</p>
            <p className="mt-1 text-[13px] text-[#374151]">
              Views, engagement, and approved submissions with brand-compliant deliverables.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Section 6 — Requirements */}
      <SectionCard id="requirements">
        <SectionTitle>Requirements</SectionTitle>
        <div className="grid gap-1 sm:grid-cols-2">
          <ChecklistItem label="Audience" met detail="Open worldwide" />
          <ChecklistItem label="Countries" met detail="Global" />
          <ChecklistItem label="Languages" met detail="English" />
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
            label="Face required"
            met={!campaign.requires_face}
            detail={campaign.requires_face ? "On-camera required" : "Not required"}
          />
          <ChecklistItem label="Original content" met detail="Required — no reused clips" />
          <ChecklistItem label="AI generated" met={false} detail="Not allowed unless stated in brief" />
          <ChecklistItem label="Watermark rules" met detail="No third-party watermarks" />
          <ChecklistItem label="Copyright" met detail="You must own or license all assets" />
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
          {(campaign.allowed_platforms ?? ["tiktok"]).map((platform) => (
            <div key={platform} className="rounded-[12px] border border-[#EEF0F2] p-3">
              <p className="text-[13px] font-bold capitalize text-[#111827]">{platform}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-[#6B7280]">
                <span>Video count: 1+</span>
                <span>Aspect: {getAspectRatioForPlatform(platform)}</span>
                <span>
                  Duration: {campaign.min_duration ?? "—"}s – {campaign.max_duration ?? "—"}s
                </span>
                <span>Language: English</span>
                <span>Deadline: {campaign.ends_at ? new Date(campaign.ends_at).toLocaleDateString() : "TBD"}</span>
                <span>Quality: HD, native upload</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Section 9 — Timeline */}
      <SectionCard id="timeline">
        <SectionTitle>Campaign timeline</SectionTitle>
        <ol className="space-y-3">
          {timeline.map((e) => (
            <li key={e.id} className="flex gap-3">
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
            </li>
          ))}
        </ol>
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
          <MetricTile label="Campaigns" value="1+" />
          <MetricTile label="Avg. approval" value={`${Math.round(((campaign.approved_count ?? 0) / Math.max(1, campaign.submission_count ?? 1)) * 100)}%`} />
          <MetricTile label="Review time" value={insights.avgApprovalTime} />
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

      {/* Section 12 — Similar */}
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

      {/* Section 13 — Insights */}
      <SectionCard id="insights">
        <SectionTitle>Creator insights</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricTile label="Competition" value={insights.competition} />
          <MetricTile label="Approval time" value={insights.avgApprovalTime} />
          <MetricTile label="Avg. earnings" value={insights.avgEarnings} />
          <MetricTile label="Difficulty" value={insights.difficulty} />
          <MetricTile label="Trending score" value={String(insights.trendingScore)} />
          <MetricTile label="Popularity" value={`${insights.popularity}%`} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold text-[#374151]">
            <TrendingUp className="h-3 w-3" /> {insights.trendingScore > 60 ? "Trending" : "Stable"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold text-[#374151]">
            <Users className="h-3 w-3" /> {campaign.submission_count ?? 0} creators
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold text-[#374151]">
            <Star className="h-3 w-3" /> {insights.difficulty} difficulty
          </span>
        </div>
      </SectionCard>

      {/* Section 14 — Trust */}
      <SectionCard id="trust">
        <SectionTitle>Trust &amp; safety</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "Verified brand identity",
            "Escrow-protected payouts",
            "Secure payment processing",
            "Manual content review",
            "Fraud detection monitoring",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-[12px] bg-[#FAFAFA] p-3">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span className="text-[13px] font-medium text-[#374151]">{item}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
