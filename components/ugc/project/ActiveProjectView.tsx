"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import {
  deriveProjectStage,
  deriveProjectStats,
  getProjectMeta,
} from "@/lib/ugc/active-project";
import { getProjectFlags } from "@/lib/ugc/project-storage";
import { ActiveProjectHero } from "./ActiveProjectHero";
import { ActiveProjectSections } from "./ActiveProjectSections";
import { ActiveProjectRequirements } from "./ActiveProjectRequirements";
import { ActiveProjectSkeleton } from "./ActiveProjectSkeleton";
import { ActiveProjectError } from "./ActiveProjectError";
import { useActiveProject } from "./use-active-project";

export function ActiveProjectView() {
  const { id } = useParams<{ id: string }>();
  const { state, retry, reload } = useActiveProject(id);
  const [flags, setFlags] = useState({ briefRead: false, assetsDownloaded: false });

  const refreshFlags = useCallback(() => {
    setFlags(getProjectFlags(id));
    reload();
  }, [id, reload]);

  if (state.status === "loading") {
    return <ActiveProjectSkeleton />;
  }

  if (state.status === "error") {
    return <ActiveProjectError state={state} campaignId={id} onRetry={retry} />;
  }

  const { campaign, submissions, participant, canAccessResources } = state;
  const activeFlags = flags.briefRead || flags.assetsDownloaded ? flags : state.flags;
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
        <ActiveProjectSections
          campaign={campaign}
          campaignId={id}
          submissions={submissions}
          participant={participant}
          canAccessResources={canAccessResources}
          flags={activeFlags}
          onFlagsChange={refreshFlags}
        />
        <aside className="space-y-4">
          <ActiveProjectRequirements campaign={campaign} />
          <div className="hidden rounded-[16px] border border-[#EEF0F2] bg-white p-4 lg:block">
            <p className="text-[12px] font-semibold text-[#111827]">Campaign details</p>
            <Link
              href={`/ugc/${id}`}
              className="mt-2 inline-block text-[12px] font-semibold text-[#FF5A1F] hover:underline"
            >
              View full brief →
            </Link>
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
