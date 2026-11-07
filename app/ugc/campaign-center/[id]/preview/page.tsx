"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Monitor, Smartphone } from "lucide-react";
import {
  CampaignPreviewPanel,
  type CampaignPreviewData,
} from "@/components/ugc/campaign-center/CampaignPreviewPanel";
import { CampaignCheckerPanel } from "@/components/ugc/campaign-center/CampaignCheckerPanel";
import { cn } from "@/lib/utils";

export default function CampaignPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CampaignPreviewData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/ugc/campaigns/${id}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(json.error || "Could not load campaign");
          return;
        }
        const c = json.campaign ?? {};
        const vendor = c.vendor ?? c.brand ?? {};
        if (!cancelled) {
          setData({
            title: c.title,
            description: c.description,
            campaign_type: c.campaign_type,
            payment_model: c.payment_model,
            rate_per_1k_views: c.rate_per_1k_views,
            fixed_rate: c.fixed_rate,
            total_budget: c.total_budget,
            allowed_platforms: c.allowed_platforms,
            required_hashtags: c.required_hashtags,
            required_mentions: c.required_mentions,
            content_format: c.content_format,
            min_duration: c.min_duration,
            max_duration: c.max_duration,
            creator_limit: c.creator_limit,
            country_codes: c.country_codes,
            all_countries: c.all_countries,
            ends_at: c.ends_at,
            brand_name: vendor.store_name || vendor.name || c.brand_name,
            brand_logo: vendor.logo_url || vendor.avatar_url,
            brand_verified: vendor.verification_status === "verified",
            media_count: Array.isArray(c.media) ? c.media.length : c.media_count ?? 0,
            status: c.status,
          });
        }
      } catch {
        if (!cancelled) setError("Could not load campaign");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const editHref = useMemo(() => `/ugc/campaign-center/${id}/edit`, [id]);
  const isDraft = !data?.status || data.status === "draft" || data.status === "paused";

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to editing
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Campaign preview</h1>
        </div>
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setMode("desktop")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium",
              mode === "desktop" ? "bg-slate-900 text-white" : "text-slate-600",
            )}
          >
            <Monitor className="h-3.5 w-3.5" />
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setMode("mobile")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium",
              mode === "mobile" ? "bg-slate-900 text-white" : "text-slate-600",
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Mobile
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading draft…
        </div>
      ) : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {data ? (
        <>
          <CampaignPreviewPanel data={data} mode={mode} draft={isDraft} editHref={editHref} />
          <CampaignCheckerPanel campaignId={id} />
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/ugc/campaign-center/${id}/fund`}
              className="inline-flex rounded-full bg-[#1D9BF0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a8cd8]"
            >
              Fund & activate (min $100)
            </Link>
            <Link
              href={`/ugc/${id}`}
              className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Open public page
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
