// components/workspace/WorkspaceLeftNav.tsx
"use client";

import {
  Home, Layers, Radio, Target, GraduationCap, Calendar, Users, BookOpen,
  Plus, Sparkles, type LucideIcon,
} from "lucide-react";
import type { WorkspaceSection, WorkspaceView } from "@/types/workspace";

const SECTIONS: { key: WorkspaceSection; label: string; icon: LucideIcon; ready: boolean }[] = [
  { key: "feed", label: "Feed", icon: Home, ready: true },
  { key: "spaces", label: "Spaces", icon: Layers, ready: false },
  { key: "live", label: "Live", icon: Radio, ready: false },
  { key: "missions", label: "Missions", icon: Target, ready: true },
  { key: "courses", label: "Courses", icon: GraduationCap, ready: false },
  { key: "events", label: "Events", icon: Calendar, ready: false },
  { key: "members", label: "Members", icon: Users, ready: true },
  { key: "resources", label: "Resources", icon: BookOpen, ready: false },
];

interface Props {
  section: WorkspaceSection;
  view: WorkspaceView;
  onSectionChange: (s: WorkspaceSection) => void;
  isAdmin: boolean;
}

export function WorkspaceLeftNav({ section, view, onSectionChange, isAdmin }: Props) {
  return (
    <nav className="sticky top-[72px] flex flex-col gap-1">
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const isActive = section === s.key;
        return (
          <button
            type="button"
            key={s.key}
            onClick={() => onSectionChange(s.key)}
            className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-[13px] font-medium ${
              isActive
                ? "bg-[#fd5000] text-white shadow-sm shadow-[#fd5000]/20"
                : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">{s.label}</span>
            {!s.ready && (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-surface-secondary text-text-muted group-hover:bg-bg"
                }`}
              >
                SOON
              </span>
            )}
          </button>
        );
      })}

      {/* Admin-only quick action */}
      {isAdmin && view === "admin" && (
        <button
          type="button"
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-[#fd5000]/50 hover:bg-[#fd5000]/5 transition-all text-[12px] font-semibold text-text-muted hover:text-[#fd5000]"
        >
          <Plus className="w-3.5 h-3.5" />
          New mission
        </button>
      )}

      {/* Footer: invite */}
      <div className="mt-6 p-3 rounded-xl bg-gradient-to-br from-[#fff3ee] to-[#ffe8de] dark:from-[#200d00] dark:to-[#1a0700] border border-[#ffd5c2] dark:border-[#3d1200]">
        <Sparkles className="w-4 h-4 text-[#fd5000] mb-1.5" />
        <p className="text-[12px] font-bold text-[#fd5000] mb-0.5">Invite creators</p>
        <p className="text-[11px] text-[#c94700] dark:text-[#ff7a3d] mb-2 leading-snug">
          Grow the community
        </p>
        <button
          type="button"
          className="text-[11px] font-semibold text-[#fd5000] hover:underline"
        >
          Copy invite link →
        </button>
      </div>
    </nav>
  );
}