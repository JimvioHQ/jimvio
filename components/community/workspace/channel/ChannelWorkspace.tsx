"use client";

import { useState, useCallback, type ReactNode } from "react";
import type {
  ChannelTabId,
  WorkspaceChannel,
  WorkspaceGroup,
} from "@/lib/community/workspace";
import { ChannelHeader } from "./ChannelHeader";
import { ChannelTabs } from "./ChannelTabs";
import { ChannelRightDrawer } from "./ChannelRightDrawer";
import { FilesPanel } from "./panels/FilesPanel";
import { MediaPanel } from "./panels/MediaPanel";
import { PinnedPanel } from "./panels/PinnedPanel";
import { MembersPanel, type ChannelMemberRow } from "./panels/MembersPanel";

/**
 * Single reusable Channel page layout:
 * Header → Tabs → Content (Discussion / Files / Media / Pinned / Members) → optional Right Drawer.
 *
 * Discussion content is injected so existing ChatRoom / room renderers stay the source of truth.
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
}) {
  const [tab, setTab] = useState<ChannelTabId>(initialTab);

  const handleSearch = useCallback(() => {
    onSearch?.();
  }, [onSearch]);

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
          {tab === "discussion" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{discussion}</div>
          )}
          {tab === "files" && <FilesPanel />}
          {tab === "media" && <MediaPanel />}
          {tab === "pinned" && <PinnedPanel pinnedCount={channel.pinnedCount} />}
          {tab === "members" && <MembersPanel members={members} />}
        </div>
      </div>

      <ChannelRightDrawer open={drawerOpen}>{drawer}</ChannelRightDrawer>
    </div>
  );
}
