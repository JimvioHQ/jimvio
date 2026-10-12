"use client";

import type { UGCCampaign } from "@/types/ugc";
import { ProjectCard, ProjectSectionTitle } from "./active-project-ui";
import { Pill } from "@/components/ugc/campaign-detail/campaign-detail-ui";

type ActiveProjectRequirementsProps = {
  campaign: UGCCampaign;
};

function ReqRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="border-b border-[#EEF0F2] py-2.5 last:border-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{label}</p>
      <p className="mt-0.5 text-[13px] text-[#374151]">{value}</p>
    </div>
  );
}

export function ActiveProjectRequirements({ campaign }: ActiveProjectRequirementsProps) {
  const duration =
    campaign.min_duration || campaign.max_duration
      ? `${campaign.min_duration ?? 0}s – ${campaign.max_duration ?? "∞"}s`
      : null;

  const platforms = (campaign.allowed_platforms ?? []).join(", ") || null;
  const hashtags = (campaign.required_hashtags ?? []).map((h) => `#${h.replace(/^#/, "")}`).join(" ");
  const mentions = (campaign.required_mentions ?? []).map((m) => `@${m.replace(/^@/, "")}`).join(" ");
  const music = campaign.music_artist_name
    ? `${campaign.music_artist_name}${campaign.music_track_url ? " (track provided)" : ""}`
    : campaign.music_track_url
      ? "Track provided"
      : null;
  const restrictions = [
    campaign.requires_face ? "Face on camera required" : null,
    (campaign.required_keywords ?? []).length > 0
      ? `Keywords: ${campaign.required_keywords.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ProjectCard id="requirements" className="lg:sticky lg:top-4">
      <ProjectSectionTitle sub="Always refer to these before submitting">Requirements</ProjectSectionTitle>

      <ReqRow label="Video length" value={duration} />
      <ReqRow label="Platforms" value={platforms} />
      <ReqRow label="Audience" value={campaign.vendor?.business_country} />
      <ReqRow label="Hashtags" value={hashtags || null} />
      <ReqRow label="Mentions" value={mentions || null} />
      <ReqRow label="CTA" value={campaign.promotion_target ?? campaign.promotion_target_url} />
      <ReqRow label="Music" value={music} />
      <ReqRow label="Restrictions" value={restrictions || "Standard brand safety guidelines"} />

      {campaign.content_guidelines ? (
        <div className="mt-3 rounded-xl bg-[#FAFAFA] p-3">
          <p className="text-[10px] font-semibold uppercase text-[#9CA3AF]">Guidelines</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#374151]">{campaign.content_guidelines}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(campaign.allowed_platforms ?? []).map((p) => (
          <Pill key={p} tone="brand">
            {p}
          </Pill>
        ))}
      </div>
    </ProjectCard>
  );
}
