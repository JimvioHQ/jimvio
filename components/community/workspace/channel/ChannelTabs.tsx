"use client";

import { CHANNEL_TABS, type ChannelTabId } from "@/lib/community/workspace";
import { WorkspaceTabBar } from "@/components/community/workspace/shared/WorkspaceTabBar";

export function ChannelTabs({
  active,
  onChange,
  className,
}: {
  active: ChannelTabId;
  onChange: (id: ChannelTabId) => void;
  className?: string;
}) {
  return (
    <WorkspaceTabBar
      tabs={CHANNEL_TABS}
      active={active}
      onChange={(id) => onChange(id as ChannelTabId)}
      ariaLabel="Channel sections"
      idPrefix="channel-tab"
      className={className}
    />
  );
}
