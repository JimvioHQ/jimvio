"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import {
  deriveProjectStage,
  deriveProjectStats,
  getProjectMeta,
} from "@/lib/ugc/active-project";
import { ActiveProjectHero } from "./ActiveProjectHero";
import { CreatorCampaignResults } from "./CreatorCampaignResults";
import { ActiveProjectRequirements } from "./ActiveProjectRequirements";
import { ActiveProjectSkeleton } from "./ActiveProjectSkeleton";
import { ActiveProjectError } from "./ActiveProjectError";
import { useActiveProject } from "./use-active-project";

export function ActiveProjectView() {
  const { id } = useParams<{ id: string }>();
  const { state, retry, reload } = useActiveProject(id);

  if (state.status === "loading") {
    return <ActiveProjectSkeleton />;
  }

  if (state.status === "error") {
    return <ActiveProjectError state={state} campaignId={id} onRetry={retry} />;
  }

  const { campaign, submissions, participant } = state;
  const stage = deriveProjectStage(campaign, submissions, participant);
  const stats = deriveProjectStats(campaign, submissions, stage);
  const meta = getProjectMeta(campaign);

  const isArchived = campaign.status === "completed" || campaign.status === "cancelled";

  return (
    <div className="bg-[#FAFAFA] pb-28 lg:pb-10">
      {isArchived ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-[12px] font-medium text-amber-800">
          This campaign has been archived. You can still view your project history and earnings.
        </div>
      ) : null}

      <ActiveProjectHero
        campaign={campaign}
        stage={stage}
        progressPercent={stats.progressPercent}
        joinedAt={participant.joined_at}
        rewardType={meta.rewardType}
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        <CreatorCampaignResults campaign={campaign} campaignId={id} submissions={submissions} onReload={reload} />
        <aside className="space-y-4">
          <ActiveProjectRequirements campaign={campaign} />
          <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4 text-[12.5px] leading-relaxed text-[#4B5563]">
            <p className="mb-1.5 text-[13px] font-semibold text-[#111827]">How you get paid</p>
            <p>1. Post, then submit the link here right away.</p>
            <p>2. Jimvio checks your real views on the platform.</p>
            <p>3. The brand approves — or tells you why not.</p>
            <p>4. Verified views are paid to your wallet right after approval. If Jimvio could not verify them, the payment waits 24 hours.</p>
          </div>
        </aside>
      </div>

      {/* Mobile sticky submit */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EEF0F2] bg-white/95 p-3 backdrop-blur lg:hidden">
        <Link
          href={`/ugc/${id}/submit`}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A1F] text-sm font-bold text-white shadow-lg"
        >
          <Plus className="h-5 w-5" />
          Submit content
        </Link>
      </div>
    </div>
  );
}
