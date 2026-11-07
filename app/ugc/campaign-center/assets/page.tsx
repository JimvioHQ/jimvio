"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ImageIcon } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useUgcBrandWorkspace } from "@/components/ugc/workspace/UgcBrandWorkspaceProvider";

type MediaRow = {
  campaignId: string;
  campaignTitle: string;
  url: string;
  type: string;
  usage: string;
};

export default function CampaignAssetsPage() {
  const { ugcFetch, brandReady, brandId } = useUgcBrandWorkspace();
  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brandReady || !brandId) return;
    let cancelled = false;
    setLoading(true);
    ugcFetch("/api/ugc/campaigns?status=all&limit=50&mine=true")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setCampaigns(j.data ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ugcFetch, brandReady, brandId]);

  const assets = useMemo(() => {
    const rows: MediaRow[] = [];
    for (const c of campaigns) {
      const media = (c as UGCCampaign & { media?: { url: string; type?: string; usage?: string }[] })
        .media;
      if (!Array.isArray(media)) continue;
      for (const m of media) {
        if (!m?.url) continue;
        rows.push({
          campaignId: c.id,
          campaignTitle: c.title,
          url: m.url,
          type: m.type || "image",
          usage: m.usage || "example",
        });
      }
    }
    return rows;
  }, [campaigns]);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#FF5A1F]">
        Campaign Center
      </p>
      <h1 className="mt-1 text-[24px] font-bold tracking-tight text-[#111827] sm:text-[28px]">
        Campaign Assets
      </h1>
      <p className="mt-1 text-[13px] text-[#6B7280]">
        Covers, examples, and creative files attached to your campaigns.
      </p>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-[#F3F4F6]" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#E5E7EB] px-6 py-12 text-center">
          <ImageIcon className="mx-auto h-8 w-8 text-[#D1D5DB]" />
          <p className="mt-3 text-[14px] font-semibold text-[#111827]">No assets yet</p>
          <Link
            href="/ugc/campaign-center/create"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-[#FF5A1F] px-4 text-[13px] font-bold text-white"
          >
            Upload with Create Campaign
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((a) => (
            <Link
              key={`${a.campaignId}-${a.url}`}
              href={`/ugc/campaign-center/${a.campaignId}/edit`}
              className="group overflow-hidden rounded-2xl border border-[#EEF0F2] bg-white"
            >
              <div className="relative aspect-square bg-[#F3F4F6]">
                {a.type === "video" ? (
                  <video src={a.url} className="h-full w-full object-cover" muted preload="metadata" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                )}
              </div>
              <div className="p-2.5">
                <p className="truncate text-[12px] font-semibold text-[#111827]">{a.campaignTitle}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                  {a.usage}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
