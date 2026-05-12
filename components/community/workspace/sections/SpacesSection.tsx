// components/workspace/sections/SpacesSection.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown, ChevronRight, MessageCircle, BookOpen, FileText,
  Folder, CheckSquare, LayoutList, Hash, Plus, Lock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import type { WorkspaceCommunity } from "@/types/workspace";

interface Props {
  community: WorkspaceCommunity;
  spacesWithRooms: WorkspaceSpaceRow[];
  isAdmin?: boolean;
  isOwner?: boolean;
}

function roomTypeIcon(roomType: string): LucideIcon {
  switch (roomType) {
    case "chat": return MessageCircle;
    case "course": return BookOpen;
    case "posts": return FileText;
    case "resources": return Folder;
    case "tasks": return CheckSquare;
    case "thread": return Hash;
    default: return LayoutList;
  }
}

export function SpacesSection({ community, spacesWithRooms, isAdmin = false, isOwner = false }: Props) {
  const router = useRouter();
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>(
    spacesWithRooms.reduce((acc, space) => {
      acc[space.id] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const hasContent = spacesWithRooms.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col gap-5 max-w-3xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-text-primary">Spaces & Rooms</h2>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#fd5000]/10 flex items-center justify-center mb-3">
            <LayoutList className="w-6 h-6 text-[#fd5000]" />
          </div>
          <h3 className="text-[15px] font-bold text-text-primary mb-1">No spaces yet</h3>
          <p className="text-[12px] text-text-muted max-w-sm">
            {isOwner
              ? "Create your first space to organize conversations and build your community."
              : "This community doesn't have any spaces yet. Check back soon!"}
          </p>
          {isOwner && (
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white px-4 py-2 rounded-lg transition-all"
              style={{ background: "linear-gradient(135deg, #fd5000, #ff7a30)" }}
            >
              <Plus className="w-4 h-4" />
              Create Space
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-text-primary">Spaces & Rooms</h2>
        <span className="text-[12px] text-text-muted">
          {spacesWithRooms.length} space{spacesWithRooms.length !== 1 ? "s" : ""} · {spacesWithRooms.reduce((sum, s) => sum + s.rooms.length, 0)} room{spacesWithRooms.reduce((sum, s) => sum + s.rooms.length, 0) !== 1 ? "s" : ""}
        </span>
      </div>

      {isOwner && (
        <button
          type="button"
          className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#fd5000] px-4 py-3 rounded-lg border border-[#fd5000]/30 hover:bg-[#fd5000]/5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New Space
        </button>
      )}

      <div className="space-y-3">
        {spacesWithRooms.map((space) => {
          const isExpanded = expandedSpaces[space.id] ?? true;
          const Icon = space.icon ? (LayoutList) : (Folder);

          return (
            <div
              key={space.id}
              className="rounded-xl bg-surface border border-border overflow-hidden"
            >
              {/* Space header */}
              <button
                type="button"
                onClick={() => setExpandedSpaces((prev) => ({ ...prev, [space.id]: !prev[space.id] }))}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-secondary/30 transition-colors"
              >
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  )}
                </div>

                <div className="w-6 h-6 rounded-lg bg-[#fd5000]/10 flex items-center justify-center flex-shrink-0">
                  <Folder className="w-3.5 h-3.5 text-[#fd5000]" />
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-semibold text-text-primary truncate">{space.name}</p>
                  {space.rooms.length > 0 && (
                    <p className="text-[11px] text-text-muted">
                      {space.rooms.length} room{space.rooms.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                <span className="text-[11px] text-text-muted font-medium px-2 py-1 rounded-md bg-surface-secondary">
                  {space.access_type === "paid" ? "Paid" : "Free"}
                </span>
              </button>

              {/* Rooms list */}
              {isExpanded && space.rooms.length > 0 && (
                <div className="border-t border-border bg-surface-secondary/30 divide-y divide-border">
                  {space.rooms.map((room) => {
                    const RoomIcon = roomTypeIcon(room.room_type);

                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => {
                          router.push(
                            `/c/${community.slug}/workspace/room?space=${room.space_id}&room=${room.id}`
                          );
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-surface transition-colors text-left group"
                      >
                        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-text-muted group-hover:text-[#fd5000] transition-colors">
                          {room.is_locked ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <RoomIcon className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-text-primary group-hover:text-[#fd5000] transition-colors truncate">
                            {room.name}
                          </p>
                        </div>

                        {room.is_locked && (
                          <Lock className="w-3 h-3 text-text-muted flex-shrink-0" />
                        )}

                        <span className="text-[10px] text-text-muted group-hover:text-[#fd5000] transition-colors font-medium">
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Empty rooms state */}
              {isExpanded && space.rooms.length === 0 && (
                <div className="border-t border-border bg-surface-secondary/30 px-4 py-6 text-center">
                  <p className="text-[12px] text-text-muted">No rooms in this space yet</p>
                  {isAdmin && (
                    <button
                      type="button"
                      className="mt-2 text-[11px] text-[#fd5000] font-medium hover:underline"
                    >
                      + Create room
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}











