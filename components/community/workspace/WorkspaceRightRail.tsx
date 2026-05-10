// components/workspace/WorkspaceRightRail.tsx
"use client";

import Link from "next/link";
import { Radio, Trophy, CalendarDays, ChevronRight, Sparkles } from "lucide-react";
import type { WorkspaceCommunity } from "@/types/workspace";

interface Props {
  community: WorkspaceCommunity;
}

export function WorkspaceRightRail({ community }: Props) {
  return (
    <div className="sticky top-[72px] flex flex-col gap-4 max-h-[calc(100vh-88px)] overflow-y-auto">
      {/* Live now */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e5484d] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e5484d]" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">
              Live now
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center mb-2">
            <Radio className="w-4 h-4 text-text-muted" />
          </div>
          <p className="text-[11px] text-text-muted text-center">
            No live sessions right now
          </p>
        </div>
      </div>

      {/* Top earners (placeholder) */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-[#fd5000]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">
              Top this week
            </span>
          </div>
          <Link
            href={`/communities/${community.slug}/workspace?section=members`}
            className="text-[11px] text-[#fd5000] font-medium hover:underline flex items-center gap-0.5"
          >
            See all
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-[11px] text-text-muted text-center py-3">
          Leaderboard updates every Monday
        </p>
      </div>

      {/* Upcoming events */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-3.5 h-3.5 text-[#fd5000]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">
            Coming up
          </span>
        </div>
        <p className="text-[11px] text-text-muted text-center py-3">
          No events scheduled yet
        </p>
      </div>
    </div>
  );
}