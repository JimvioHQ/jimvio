"use client";

import type { UGCCampaign } from "@/types/ugc";
import { ProjectCard, ProjectSectionTitle } from "./active-project-ui";
import {
  contentFormatLabel,
  countryPolicyFromJoinConfig,
  displayPlatforms,
  platformLabel,
  readCampaignBrief,
} from "@/lib/ugc/campaign-brief";

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
  const brief = readCampaignBrief(campaign);
  const policy = countryPolicyFromJoinConfig(campaign.join_config);
  const duration =
    brief.contentFormat === "image"
      ? null
      : campaign.min_duration || campaign.max_duration
        ? `${campaign.min_duration ?? 0}s – ${campaign.max_duration ?? "—"}s`
        : null;
  const platforms = displayPlatforms(campaign.allowed_platforms).map(platformLabel).join(", ");

  return (
    <ProjectCard id="requirements" className="lg:sticky lg:top-4">
      <ProjectSectionTitle>Requirements</ProjectSectionTitle>
      <ReqRow label="Format" value={contentFormatLabel(brief.contentFormat)} />
      <ReqRow label="Video length" value={duration} />
      <ReqRow label="Deliverable" value={brief.deliverableLabel || null} />
      <ReqRow label="Platforms" value={platforms || null} />
      <ReqRow
        label="Countries"
        value={policy.mode === "all" ? "All countries" : policy.codes.join(", ")}
      />
      <ReqRow label="Key requirements" value={brief.keyRequirements.join(" · ") || null} />
      <ReqRow label="Hashtags" value={(campaign.required_hashtags ?? []).join(" ") || null} />
      <ReqRow label="Restrictions" value={brief.restrictions || (campaign.requires_face ? "Face on camera required" : null)} />
      <ReqRow label="Submission" value={brief.submissionInstructions || null} />
    </ProjectCard>
  );
}
