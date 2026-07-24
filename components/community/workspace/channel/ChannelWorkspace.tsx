"use client";

import {
  useState,
  useCallback,
  useMemo,
  lazy,
  Suspense,
  type ReactNode,
} from "react";
import type {
  ChannelTabId,
  WorkspaceChannel,
  WorkspaceGroup,
} from "@/lib/community/workspace";
import { cn } from "@/lib/utils";
import { ChannelHeader } from "./ChannelHeader";
import { ChannelTabs } from "./ChannelTabs";
import { ChannelRightDrawer } from "./ChannelRightDrawer";
import { WorkspaceSkeleton } from "@/components/community/workspace/shared/WorkspaceSkeleton";
import { useCommunityRoster } from "@/components/community/workspace/shared/useCommunityRoster";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import { extractPinned } from "@/lib/community/chat/message-experience";
import type { ChannelMemberRow } from "./panels/MembersPanel";

const FilesPanel = lazy(() =>
  import("./panels/FilesPanel").then((m) => ({ default: m.FilesPanel }))
);
const MediaPanel = lazy(() =>
  import("./panels/MediaPanel").then((m) => ({ default: m.MediaPanel }))
);
const PinnedPanel = lazy(() =>
  import("./panels/PinnedPanel").then((m) => ({ default: m.PinnedPanel }))
);
const MembersPanel = lazy(() =>
  import("./panels/MembersPanel").then((m) => ({ default: m.MembersPanel }))
);
const HomePanel = lazy(() =>
  import("./panels/HomePanel").then((m) => ({ default: m.HomePanel }))
);
const ThreadsPanel = lazy(() =>
  import("./panels/ThreadsPanel").then((m) => ({ default: m.ThreadsPanel }))
);
const KnowledgePanel = lazy(() =>
  import("./panels/KnowledgePanel").then((m) => ({ default: m.KnowledgePanel }))
);
const EventsPanel = lazy(() =>
  import("./panels/EventsPanel").then((m) => ({ default: m.EventsPanel }))
);
const ChannelAiPanel = lazy(() =>
  import("./panels/ChannelAiPanel").then((m) => ({ default: m.ChannelAiPanel }))
);

/**
 * Channel Creator Workspace — Overview first, Discussion loads ChatRoom.
 * Discussion is injected so ChatRoom stays the source of truth (never forked).
 */
export function ChannelWorkspace({
  channel,
  group,
  discussion,
  memberCount,
  onlineCount,
  members: membersProp,
  drawerOpen = false,
  drawer,
  initialTab = "home",
  onSearch,
  roomId,
  communityId,
  communitySlug,
  userId,
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
  communitySlug?: string | null;
  userId?: string | null;
  canManageKnowledge?: boolean;
}) {
  const [tab, setTab] = useState<ChannelTabId>(initialTab);
  const resolvedRoomId = roomId ?? channel.id;
  const requestOpenThread = useRoomMessageIndex((s) => s.requestOpenThread);
  const requestConvertThread = useRoomMessageIndex(
    (s) => s.requestConvertThread
  );
  const requestSearch = useRoomMessageIndex((s) => s.requestSearch);
  const messages = useRoomMessageIndex((s) =>
    resolvedRoomId ? (s.byRoom[resolvedRoomId]?.messages ?? []) : []
  );
  const pinnedCount = useMemo(
    () => extractPinned(messages).length || channel.pinnedCount,
    [messages, channel.pinnedCount]
  );

  const { members: rosterMembers } = useCommunityRoster(
    membersProp && membersProp.length > 0 ? null : communityId
  );
  const members = membersProp && membersProp.length > 0 ? membersProp : rosterMembers;

  const handleSearch = useCallback(() => {
    onSearch?.();
    setTab("discussion");
    requestSearch();
  }, [onSearch, requestSearch]);

  const openDiscussion = useCallback(() => setTab("discussion"), []);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-[var(--color-bg,#f4f4f5)]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-surface)]">
        <ChannelHeader
          channel={channel}
          group={group}
          memberCount={memberCount ?? members.length}
          onlineCount={onlineCount}
          pinnedCount={pinnedCount}
          onSearchClick={handleSearch}
          onOpenMembers={() => setTab("members")}
          onOpenPinned={() => setTab("pinned")}
          communityId={communityId ?? undefined}
          bookmarkHref={
            communitySlug && group
              ? `/communities/${communitySlug}/groups/${group.slug}/channels/${channel.slug}`
              : undefined
          }
        />
        <ChannelTabs active={tab} onChange={setTab} />

        <div
          role="tabpanel"
          id={`channel-tab-${tab}-panel`}
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
            id="channel-tab-discussion-panel"
          >
            {discussion}
          </div>

          {tab !== "discussion" && (
            <Suspense
              fallback={
                <WorkspaceSkeleton rows={5} className="min-h-[280px]" />
              }
            >
              {tab === "home" && (
                <HomePanel
                  roomId={resolvedRoomId}
                  channel={channel}
                  members={members}
                  onOpenTab={(id) => setTab(id as ChannelTabId)}
                />
              )}
              {tab === "threads" && (
                <ThreadsPanel
                  roomId={resolvedRoomId}
                  canManage={
                    canManageKnowledge ?? channel.permissions.canModerate
                  }
                  onOpenThread={(id) => {
                    requestOpenThread(id);
                    openDiscussion();
                  }}
                  onConvertThread={(id) => {
                    requestConvertThread(id);
                    openDiscussion();
                  }}
                  onOpenDiscussion={openDiscussion}
                />
              )}
              {tab === "knowledge" && (
                <KnowledgePanel roomId={resolvedRoomId} />
              )}
              {tab === "files" && (
                <FilesPanel
                  roomId={resolvedRoomId}
                  canManage={
                    canManageKnowledge ?? channel.permissions.canModerate
                  }
                  onOpenDiscussion={openDiscussion}
                />
              )}
              {tab === "media" && (
                <MediaPanel
                  roomId={resolvedRoomId}
                  onOpenDiscussion={openDiscussion}
                />
              )}
              {tab === "pinned" && (
                <PinnedPanel
                  roomId={resolvedRoomId}
                  pinnedCount={pinnedCount}
                  onOpenDiscussion={openDiscussion}
                  onJumpToMessage={() => openDiscussion()}
                />
              )}
              {tab === "events" && (
                <EventsPanel
                  channelName={channel.name}
                  roomId={resolvedRoomId}
                  communityId={communityId}
                  userId={userId}
                  canManage={
                    canManageKnowledge ?? channel.permissions.canModerate
                  }
                />
              )}
              {tab === "members" && <MembersPanel members={members} />}
              {tab === "ai" && (
                <ChannelAiPanel
                  roomId={resolvedRoomId}
                  communityId={communityId}
                  channelName={channel.name}
                />
              )}
            </Suspense>
          )}
        </div>
      </div>

      <ChannelRightDrawer open={drawerOpen}>{drawer}</ChannelRightDrawer>
    </div>
  );
}
