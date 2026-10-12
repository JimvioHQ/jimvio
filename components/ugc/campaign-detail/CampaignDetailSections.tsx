"use client";

import { useState, type ReactNode } from "react";
import {
  Clock,
  Download,
  FileText,
  Globe,
  List,
  Play,
  Video,
} from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { UGCPlatformMarks } from "@/components/ugc/workspace/UGCPlatformMarks";
import {
  contentFormatLabel,
  countryChipLabel,
  countryPolicyFromJoinConfig,
  displayPlatforms,
  fileTypeLabel,
  flagEmoji,
  isDirectMedia,
  platformLabel,
  readCampaignBrief,
  safeHttpUrl,
  type BriefLink,
} from "@/lib/ugc/campaign-brief";
import { SectionCard, SectionTitle } from "./campaign-detail-ui";

function ReqRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 py-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F4F5F7] text-[#4B5563]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#111827]">{label}</p>
        <p className="text-[13px] text-[#6B7280]">{value}</p>
      </div>
    </div>
  );
}

function EmptyNote({ children }: { children: string }) {
  return <p className="text-[13px] text-[#6B7280]">{children}</p>;
}

export function CampaignDetailSections({ campaign }: { campaign: UGCCampaign }) {
  const brief = readCampaignBrief(campaign);
  const policy = countryPolicyFromJoinConfig(campaign.join_config);
  const [preview, setPreview] = useState<BriefLink | null>(null);
  const format = contentFormatLabel(brief.contentFormat);
  const duration =
    brief.contentFormat === "image"
      ? null
      : campaign.min_duration || campaign.max_duration
        ? `${campaign.min_duration ?? "—"}s – ${campaign.max_duration ?? "—"}s`
        : null;
  const deliverable =
    brief.deliverableLabel ||
    (brief.deliverableCount ? `${brief.deliverableCount} deliverable${brief.deliverableCount === 1 ? "" : "s"}` : "");
  const platforms = displayPlatforms(campaign.allowed_platforms);
  const hasRequirements = Boolean(
    format ||
      duration ||
      deliverable ||
      brief.keyRequirements.length ||
      brief.productVisibility ||
      brief.captionNotes ||
      brief.language ||
      brief.restrictions ||
      brief.submissionInstructions ||
      (campaign.required_hashtags ?? []).length ||
      (campaign.required_mentions ?? []).length ||
      platforms.length,
  );
  const countries =
    policy.mode === "all"
      ? []
      : [...policy.codes.map((code) => ({ code, label: countryChipLabel(code) })), ...policy.legacyLabels.map((label) => ({ code: "", label }))];

  return (
    <div className="space-y-3">
      <SectionCard id="about">
        <SectionTitle>About this campaign</SectionTitle>
        {campaign.description ? (
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-[#4B5563]">{campaign.description}</p>
        ) : (
          <EmptyNote>No description has been added.</EmptyNote>
        )}
        {campaign.max_participants ? (
          <p className="mt-3 text-[13px] text-[#6B7280]">Creator limit: {campaign.max_participants}</p>
        ) : null}
      </SectionCard>

      <SectionCard id="requirements">
        <SectionTitle sub="Follow the requirements below to create your content">Content requirements</SectionTitle>
        {hasRequirements ? (
          <div className="divide-y divide-[#F3F4F6]">
            {format ? <ReqRow icon={<Video className="h-4 w-4" />} label="Content format" value={format} /> : null}
            {duration ? <ReqRow icon={<Clock className="h-4 w-4" />} label="Video length" value={duration} /> : null}
            {deliverable ? (
              <ReqRow icon={<FileText className="h-4 w-4" />} label="Deliverables" value={deliverable} />
            ) : null}
            {brief.keyRequirements.length > 0 ? (
              <div className="flex gap-3 py-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F4F5F7] text-[#4B5563]">
                  <List className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#111827]">Key requirements</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] text-[#6B7280]">
                    {brief.keyRequirements.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
            {brief.productVisibility ? (
              <ReqRow icon={<Video className="h-4 w-4" />} label="Product visibility" value={brief.productVisibility} />
            ) : null}
            {brief.captionNotes ? (
              <ReqRow icon={<FileText className="h-4 w-4" />} label="Caption and calls to action" value={brief.captionNotes} />
            ) : null}
            {brief.language ? <ReqRow icon={<Globe className="h-4 w-4" />} label="Language" value={brief.language} /> : null}
            {brief.restrictions ? (
              <ReqRow icon={<List className="h-4 w-4" />} label="Restrictions" value={brief.restrictions} />
            ) : null}
            {brief.submissionInstructions ? (
              <ReqRow icon={<FileText className="h-4 w-4" />} label="Submission instructions" value={brief.submissionInstructions} />
            ) : null}
            {(campaign.required_hashtags ?? []).length > 0 ? (
              <ReqRow
                icon={<List className="h-4 w-4" />}
                label="Hashtags"
                value={(campaign.required_hashtags ?? []).map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ")}
              />
            ) : null}
            {(campaign.required_mentions ?? []).length > 0 ? (
              <ReqRow
                icon={<List className="h-4 w-4" />}
                label="Mentions"
                value={(campaign.required_mentions ?? []).map((tag) => `@${tag.replace(/^@/, "")}`).join(" ")}
              />
            ) : null}
            {platforms.length > 0 ? (
              <div className="flex items-center gap-3 py-3">
                <UGCPlatformMarks platforms={platforms} />
                <p className="text-[13px] text-[#6B7280]">{platforms.map(platformLabel).join(", ")}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyNote>The brand has not added content requirements yet.</EmptyNote>
        )}
      </SectionCard>

      <SectionCard id="countries">
        <SectionTitle sub="Content is eligible from the following countries">Eligible countries</SectionTitle>
        {policy.mode === "all" ? (
          <EmptyNote>All countries</EmptyNote>
        ) : (
          <div className="flex flex-wrap gap-2">
            {countries.map((country) => (
              <span
                key={`${country.code}-${country.label}`}
                className="inline-flex items-center gap-2 rounded-full border border-[#E7E9EE] bg-[#FAFAFA] px-3 py-1.5 text-[13px] font-medium text-[#111827]"
              >
                <span aria-hidden>{country.code ? flagEmoji(country.code) : "•"}</span>
                {country.label}
              </span>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard id="references">
        <SectionTitle sub="Use these examples as inspiration">References</SectionTitle>
        {brief.references.length === 0 ? (
          <EmptyNote>No reference examples have been added.</EmptyNote>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {brief.references.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-xl border border-[#EEF0F2]">
                <LinkPreview item={item} onPlay={() => setPreview(item)} />
                <div className="px-3 py-2">
                  <p className="truncate text-[13px] font-semibold text-[#111827]">{item.title}</p>
                  {item.note ? <p className="mt-0.5 text-[12px] text-[#6B7280]">{item.note}</p> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard id="resources">
        <SectionTitle sub="Helpful links and documents">Resources</SectionTitle>
        {brief.resources.length === 0 ? (
          <EmptyNote>No resources have been added.</EmptyNote>
        ) : (
          <ul className="divide-y divide-[#F3F4F6]">
            {brief.resources.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <FileText className="h-4 w-4 shrink-0 text-[#FF5A1F]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#111827]">{item.title}</p>
                  <p className="text-[11px] text-[#9CA3AF]">{fileTypeLabel(item)}</p>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-[#E5E7EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
                  aria-label={`Open ${item.title}`}
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard id="assets">
        <SectionTitle sub="Use these official assets in your content">Brand assets</SectionTitle>
        {brief.assets.length === 0 && !safeHttpUrl(campaign.vendor?.business_logo ?? "") ? (
          <EmptyNote>No brand assets have been added.</EmptyNote>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {safeHttpUrl(campaign.vendor?.business_logo ?? "") &&
            !brief.assets.some((asset) => asset.url === campaign.vendor?.business_logo) ? (
              <AssetCard
                item={{
                  id: "vendor-logo",
                  title: "Brand logo",
                  url: safeHttpUrl(campaign.vendor?.business_logo ?? "")!,
                  note: "",
                  kind: "image",
                  fileType: "IMAGE",
                }}
              />
            ) : null}
            {brief.assets.map((item) => (
              <AssetCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </SectionCard>

      {preview && isDirectMedia(preview) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black">
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1 text-xs text-white"
            >
              Close
            </button>
            {preview.kind === "video" ? (
              <video src={preview.url} controls className="max-h-[80vh] w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt={preview.title} className="max-h-[80vh] w-full object-contain" />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LinkPreview({ item, onPlay }: { item: BriefLink; onPlay: () => void }) {
  if (item.kind === "image") {
    return (
      <button type="button" onClick={onPlay} className="relative block aspect-video w-full bg-[#F3F4F6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.url} alt="" className="h-full w-full object-cover" />
      </button>
    );
  }
  if (item.kind === "video") {
    return (
      <button type="button" onClick={onPlay} className="relative grid aspect-video w-full place-items-center bg-[#111827]">
        <Play className="h-8 w-8 text-white" />
      </button>
    );
  }
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="grid aspect-video w-full place-items-center bg-[#F8FAFC] text-[12px] font-semibold text-[#FF5A1F]"
    >
      Open reference
    </a>
  );
}

function AssetCard({ item }: { item: BriefLink }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block min-w-0">
      <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[#EEF0F2] bg-[#F8FAFC]">
        {item.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-[11px] font-semibold text-[#6B7280]">{fileTypeLabel(item)}</div>
        )}
      </div>
      <p className="mt-1.5 truncate text-[12px] font-semibold text-[#111827]">{item.title}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{fileTypeLabel(item)}</p>
    </a>
  );
}
