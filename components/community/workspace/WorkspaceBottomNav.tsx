// components/workspace/WorkspaceBottomNav.tsx
"use client";

import { Home, Target, Users, MoreHorizontal, Layers } from "lucide-react";
import type { WorkspaceSection } from "@/types/workspace";

const TABS: { key: WorkspaceSection | "more"; label: string; icon: typeof Home }[] = [
  { key: "feed", label: "Feed", icon: Home },
  { key: "spaces", label: "Spaces", icon: Layers },
  { key: "missions", label: "Missions", icon: Target },
  { key: "members", label: "Members", icon: Users },
  { key: "more", label: "More", icon: MoreHorizontal },
];

interface Props {
  section: WorkspaceSection;
  onSectionChange: (s: WorkspaceSection) => void;
}

export function WorkspaceBottomNav({ section, onSectionChange }: Props) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-bg/95 backdrop-blur-md border-t border-border safe-area-inset-bottom">
      <div className="grid grid-cols-5 h-16">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = section === t.key;
          const isMore = t.key === "more";
          return (
            <button
              type="button"
              key={t.key}
              onClick={() => {
                if (!isMore) onSectionChange(t.key as WorkspaceSection);
                // For "more": you'd open a sheet listing live, courses, events, resources
              }}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? "text-[#fd5000]" : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}