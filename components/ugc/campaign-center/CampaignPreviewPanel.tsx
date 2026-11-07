"use client";

import Link from "next/link";
import { BlueVerifiedBadge } from "@/components/verification/BlueVerifiedBadge";
import { formatUSD } from "@/lib/currency/platform";
import { cn } from "@/lib/utils";

export type CampaignPreviewData = {
  title?: string | null;
  description?: string | null;
  campaign_type?: string | null;
  payment_model?: string | null;
  rate_per_1k_views?: number | null;
  fixed_rate?: number | null;
  total_budget?: number | null;
  allowed_platforms?: string[] | null;
  required_hashtags?: string[] | null;
  required_mentions?: string[] | null;
  content_format?: string | null;
  min_duration?: number | null;
  max_duration?: number | null;
  creator_limit?: number | null;
  country_codes?: string[] | null;
  all_countries?: boolean | null;
  ends_at?: string | null;
  brand_name?: string | null;
  brand_logo?: string | null;
  brand_verified?: boolean | null;
  media_count?: number | null;
  status?: string | null;
};

export function CampaignPreviewPanel({
  data,
  mode = "desktop",
  draft = true,
  className,
  editHref,
}: {
  data: CampaignPreviewData;
  mode?: "desktop" | "mobile";
  draft?: boolean;
  className?: string;
  editHref?: string;
}) {
  const platforms = (data.allowed_platforms ?? []).map((p) => p.replaceAll("_", " "));
  const hashtags = data.required_hashtags ?? [];
  const countries = data.all_countries
    ? ["All countries"]
    : (data.country_codes ?? []).map((c) => c.toUpperCase());
  const reward =
    data.payment_model === "fixed_per_content" || data.payment_model === "fixed"
      ? `Fixed ${formatUSD(Number(data.fixed_rate ?? 0))} / submission`
      : `${formatUSD(Number(data.rate_per_1k_views ?? 0))} / 1K views`;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm",
        mode === "mobile" ? "mx-auto w-full max-w-[390px]" : "w-full",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-slate-50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              draft
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800",
            )}
          >
            {draft ? "Draft preview" : "Public campaign"}
          </span>
          <span className="text-[11px] text-slate-500">
            {mode === "mobile" ? "Mobile" : "Desktop"} layout
          </span>
        </div>
        {editHref ? (
          <Link href={editHref} className="text-[12px] font-medium text-[#1D9BF0] hover:underline">
            Back to editing
          </Link>
        ) : null}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {data.brand_logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.brand_logo}
              alt=""
              className="h-11 w-11 rounded-full object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
              {(data.brand_name ?? "B").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-slate-900">
                {data.brand_name ?? "Your brand"}
              </p>
              <BlueVerifiedBadge verified={Boolean(data.brand_verified)} size="sm" />
            </div>
            <p className="text-[11px] capitalize text-slate-500">
              {(data.campaign_type ?? "ugc").replaceAll("_", " ")} campaign
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            {data.title?.trim() || "Untitled campaign"}
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {data.description?.trim() || "No description yet. Add objectives and instructions."}
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PreviewFact label="Reward" value={reward} />
          <PreviewFact label="Budget" value={formatUSD(Number(data.total_budget ?? 0))} />
          <PreviewFact label="Platforms" value={platforms.join(", ") || "—"} />
          <PreviewFact
            label="Format"
            value={(data.content_format ?? "—").replaceAll("_", " ")}
          />
          <PreviewFact
            label="Duration"
            value={
              data.min_duration && data.max_duration
                ? `${data.min_duration}–${data.max_duration}s`
                : "—"
            }
          />
          <PreviewFact
            label="Creator limit"
            value={data.creator_limit && data.creator_limit > 0 ? String(data.creator_limit) : "No limit"}
          />
          <PreviewFact label="Target markets" value={countries.join(", ") || "—"} />
          <PreviewFact
            label="Deadline"
            value={
              data.ends_at
                ? new Date(data.ends_at).toLocaleDateString()
                : "Until budget runs out"
            }
          />
          <PreviewFact
            label="Hashtags"
            value={hashtags.length ? hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ") : "—"}
          />
          <PreviewFact
            label="Mentions"
            value={(data.required_mentions ?? []).join(", ") || "—"}
          />
          <PreviewFact label="Assets" value={`${data.media_count ?? 0} attached`} />
          <PreviewFact label="Status" value={data.status ?? "draft"} />
        </dl>

        <div className="rounded-xl bg-slate-50 px-3 py-3 text-[12px] leading-relaxed text-slate-600">
          Creators join from Discover Campaigns, follow the brief, and submit content for review.
          Payouts release from escrow only after brand approval. Minimum funding to activate is{" "}
          <strong>$100.00 USD</strong> (or equivalent).
        </div>
      </div>
    </div>
  );
}

function PreviewFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium capitalize text-slate-800">{value}</dd>
    </div>
  );
}
