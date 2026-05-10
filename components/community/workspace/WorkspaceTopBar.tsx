// components/workspace/WorkspaceTopBar.tsx
"use client";

import Link from "next/link";
import { ChevronRight, Shield, User2 } from "lucide-react";
import type { WorkspaceCommunity, WorkspaceSection, WorkspaceView } from "@/types/workspace";

const SECTION_LABELS: Record<WorkspaceSection, string> = {
  feed: "Feed",
  spaces: "Spaces",
  live: "Live",
  missions: "Missions",
  courses: "Courses",
  events: "Events",
  members: "Members",
  resources: "Resources",
};

interface Props {
  community: WorkspaceCommunity;
  section: WorkspaceSection;
  view: WorkspaceView;
  isAdmin: boolean;
  onViewToggle: () => void;
}

export function WorkspaceTopBar({ community, section, view, isAdmin, onViewToggle }: Props) {
  return (
    <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur-md border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 h-14 flex items-center gap-3">
        {/* Community avatar + name */}
        <Link
          href={`/c/${community.slug}`}
          className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
        >
          {community.avatar_url ? (
            <img
              src={community.avatar_url}
              alt={community.name}
              className="w-8 h-8 rounded-lg object-cover ring-1 ring-border flex-shrink-0"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: "#fd5000" }}
            >
              {community.name[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-[14px] font-bold text-text-primary truncate">
            {community.name}
          </span>
        </Link>

        {/* Breadcrumb on desktop only */}
        <div className="hidden lg:flex items-center gap-1 text-text-muted">
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[13px] font-medium text-text-secondary">
            {SECTION_LABELS[section]}
          </span>
          {view === "admin" && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[12px] font-semibold text-[#fd5000] uppercase tracking-wider">
                Admin
              </span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Role switcher — only when admin */}
          {isAdmin && (
            <button
              type="button"
              onClick={onViewToggle}
              className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full transition-all duration-200 ${
                view === "admin"
                  ? "bg-[#fd5000] text-white hover:bg-[#e54900]"
                  : "bg-surface-secondary text-text-secondary hover:bg-[#fd5000]/10 hover:text-[#fd5000] border border-border"
              }`}
            >
              {view === "admin" ? (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin view</span>
                </>
              ) : (
                <>
                  <User2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Switch to admin</span>
                  <span className="sm:hidden">Admin</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}