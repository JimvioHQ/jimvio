"use client";

import { useState, useCallback, type ReactNode } from "react";
import type {
  ChannelTabId,
  WorkspaceChannel,
  WorkspaceGroup,
} from "@/lib/community/workspace";
import { cn } from "@/lib/utils";
import { ChannelHeader } from "./ChannelHeader";
import { ChannelTabs } from "./ChannelTabs";
import { ChannelRightDrawer } from "./ChannelRightDrawer";
import { FilesPanel } from "./panels/FilesPanel";
import { MediaPanel } from "./panels/MediaPanel";
import { PinnedPanel } from "./panels/PinnedPanel";
import { MembersPanel, type ChannelMemberRow } from "./panels/MembersPanel";
import { HomePanel } from "./panels/HomePanel";
import { ThreadsPanel } from "./panels/ThreadsPanel";
import { KnowledgePanel } from "./panels/KnowledgePanel";
import { EventsPanel } from "./panels/EventsPanel";
import { ChannelAiPanel } from "./panels/ChannelAiPanel";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";

/**
 * Single reusable Channel page layout (Phase 3):
 * Home · Discussion · Threads · Knowledge · Files · Media · Pinned · Events · Members · AI
 *
 * Discussion is injected so ChatRoom stays the source of truth (never forked).
 */
export function ChannelWorkspace({
  channel,
  group,
  discussion,
  memberCount,
  onlineCount,
  members,
  drawerOpen = false,
  drawer,
  initialTab = "discussion",
  onSearch,
  roomId,
  communityId,
  canManageKnowledge,
}: {
  channel: WorkspaceChannel;
  group: WorkspaceGroup | null;
  /** Existing chat / room UI — Discussion tab only */
  discussion: ReactNode;
  memberCount?: number;
  onlineCount?: number;
  members?: ChannelMemberRow[];
  drawerOpen?: boolean;
  drawer?: ReactNode;
  initialTab?: ChannelTabId;
  onSearch?: () => void;
  /** Enables index-backed panels via shared message index */
  roomId?: string;
  communityId?: string | null;
  canManageKnowledge?: boolean;
}) {
  const [tab, setTab] = useState<ChannelTabId>(initialTab);
  const resolvedRoomId = roomId ?? channel.id;
  const requestOpenThread = useRoomMessageIndex((s) => s.requestOpenThread);
  const requestConvertThread = useRoomMessageIndex(
    (s) => s.requestConvertThread
  );

  const handleSearch = useCallback(() => {
    onSearch?.();
  }, [onSearch]);

  const openDiscussion = useCallback(() => setTab("discussion"), []);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-[var(--color-bg,#f4f4f5)]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-surface)]">
        <ChannelHeader
          channel={channel}
          group={group}
          memberCount={memberCount}
          onlineCount={onlineCount}
          onSearchClick={handleSearch}
        />
        <ChannelTabs active={tab} onChange={setTab} />

        <div
          role="tabpanel"
          aria-labelledby={`channel-tab-${tab}`}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* Keep discussion mounted so ChatRoom / message index stay warm */}
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden",
              tab !== "discussion" && "hidden"
            )}
            hidden={tab !== "discussion"}
          >
            {discussion}
          </div>

          {tab === "home" && (
            <HomePanel
              roomId={resolvedRoomId}
              channel={channel}
              onOpenTab={(id) => setTab(id as ChannelTabId)}
            />
          )}
          {tab === "threads" && (
            <ThreadsPanel
              roomId={resolvedRoomId}
              canManage={canManageKnowledge ?? channel.permissions.canModerate}
              onOpenThread={(id) => {
                requestOpenThread(id);
                openDiscussion();
              }}
              onConvertThread={(id) => {
                requestConvertThread(id);
                openDiscussion();
              }}
            />
          )}
          {tab === "knowledge" && <KnowledgePanel roomId={resolvedRoomId} />}
          {tab === "files" && (
            <FilesPanel
              roomId={resolvedRoomId}
              canManage={canManageKnowledge ?? channel.permissions.canModerate}
            />
          )}
          {tab === "media" && <MediaPanel roomId={resolvedRoomId} />}
          {tab === "pinned" && (
            <PinnedPanel
              roomId={resolvedRoomId}
              pinnedCount={channel.pinnedCount}
            />
          )}
          {tab === "events" && <EventsPanel channelName={channel.name} />}
          {tab === "members" && <MembersPanel members={members} />}
          {tab === "ai" && (
            <ChannelAiPanel
              roomId={resolvedRoomId}
              communityId={communityId}
              channelName={channel.name}
            />
          )}
        </div>
      </div>

      <ChannelRightDrawer open={drawerOpen}>{drawer}</ChannelRightDrawer>
    </div>
  );
}
