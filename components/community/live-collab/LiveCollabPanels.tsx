"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { LiveSharedNotes } from "./LiveSharedNotes";
import { LiveReactionsBar } from "./LiveReactionsBar";
import { LiveKnowledgeCapture } from "./LiveKnowledgeCapture";
import { LiveCommerceRail } from "./LiveCommerceRail";
import { LiveRecordingPanel } from "./LiveRecordingPanel";
import { LiveCreatorTools } from "./LiveCreatorTools";
import { LiveRoomTypePicker } from "./LiveRoomTypePicker";
import { ScreenShareMenu } from "./ScreenShareMenu";
import {
  LivePollsCollabPanel,
  LiveQaCollabPanel,
} from "./LiveEngagementPanels";
import { TaskCard } from "@/components/community/os/TaskEventCards";
import { useCreatorOSStore } from "@/lib/community/os";
import { ResourceLibrary } from "@/components/community/os/ResourceLibrary";
import { ChannelAiPanel } from "@/components/community/workspace/channel/panels/ChannelAiPanel";

/** Lazy-load heavy canvas whiteboard */
export const LiveWhiteboardLazy = dynamic(
  () =>
    import("./LiveWhiteboard").then((m) => ({ default: m.LiveWhiteboard })),
  {
    ssr: false,
    loading: () => (
      <p className="p-6 text-center text-[12px] text-neutral-400">
        Loading whiteboard…
      </p>
    ),
  }
);

export function LiveTasksPanel({
  communityId,
  roomId,
}: {
  communityId?: string | null;
  roomId?: string | null;
}) {
  // Select the stable store array — never `.filter().slice()` inside the
  // selector (new array every call → Zustand forceStoreRerender → React #185).
  const allTasks = useCreatorOSStore((s) => s.tasks);
  const tasks = useMemo(
    () =>
      allTasks
        .filter(
          (t) =>
            (communityId && t.communityId === communityId) ||
            (roomId && t.roomId === roomId)
        )
        .slice(0, 12),
    [allTasks, communityId, roomId]
  );
  return (
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">
        Tasks
      </p>
      {tasks.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-neutral-400">
          Promote live action items into Creator OS tasks from Knowledge.
        </p>
      ) : (
        tasks.map((t) => <TaskCard key={t.id} task={t} canManage />)
      )}
    </div>
  );
}

export function LiveResourcesPanel({ roomId }: { roomId?: string | null }) {
  if (!roomId) {
    return (
      <p className="px-3 py-8 text-center text-[12px] text-neutral-400">
        Resources appear when this live session is linked to a channel room.
      </p>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      <ResourceLibrary roomIds={[roomId]} title="Live resources" />
    </div>
  );
}

export function LiveAiPanel({
  roomId,
  communityId,
  channelName,
}: {
  roomId?: string | null;
  communityId?: string | null;
  channelName?: string;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <ChannelAiPanel
        roomId={roomId ?? undefined}
        communityId={communityId}
        channelName={channelName ?? "Live"}
      />
    </div>
  );
}

export {
  LiveSharedNotes,
  LiveReactionsBar,
  LiveKnowledgeCapture,
  LiveCommerceRail,
  LiveRecordingPanel,
  LiveCreatorTools,
  LiveRoomTypePicker,
  ScreenShareMenu,
  LiveQaCollabPanel,
  LivePollsCollabPanel,
};
