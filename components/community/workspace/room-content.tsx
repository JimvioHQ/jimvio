"use client";

import { useMemo } from "react";
import { LayoutList } from "lucide-react";
import type { WorkspaceCommunity } from "@/types/workspace";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import { ChatRoom } from "../chat/ChatRoom";
import { PostsRoom } from "../rooms/PostsRoom";
import { CourseRoom } from "../rooms/CourseRoom";
import { TasksRoom } from "../rooms/TasksRoom";
import { ResourcesRoom } from "../rooms/ResourcesRoom";
import { ChannelWorkspace } from "@/components/community/workspace/channel";
import {
  mapRoomToChannel,
  mapSpaceToGroup,
} from "@/lib/community/workspace";
import type { MembershipLite } from "@/lib/community-workspace-access";

type Room = WorkspaceSpaceRow["rooms"][number];

/**
 * Shared room renderer — always wraps discussion in ChannelWorkspace
 * so sidebar/query overlays match the /room premium path.
 */
export function RoomContent({
  community,
  space,
  room,
  currentUserId,
  membership = null,
  ownerId = null,
  memberCount = 0,
  onlineCount = 0,
}: {
  community: WorkspaceCommunity;
  space: WorkspaceSpaceRow;
  room: Room;
  currentUserId: string;
  membership?: MembershipLite | null;
  ownerId?: string | null;
  memberCount?: number;
  onlineCount?: number;
}) {
  const roleInput = {
    userId: currentUserId,
    ownerId,
    membership,
  };

  const channel = useMemo(
    () => mapRoomToChannel(room, roleInput),
    // roleInput fields are primitives — intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room, currentUserId, ownerId, membership]
  );

  const group = useMemo(
    () =>
      mapSpaceToGroup(space, roleInput, {
        memberCount,
        onlineCount,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [space, currentUserId, ownerId, membership, memberCount, onlineCount]
  );

  const common = {
    roomId: room.id,
    roomName: room.name,
    communityId: community.id,
    slug: community.slug,
    hideHeader: true as const,
  };

  const discussion = (() => {
    switch (room.room_type) {
      case "posts":
        return <PostsRoom {...common} />;
      case "chat":
        return <ChatRoom {...common} />;
      case "course":
        return <CourseRoom {...common} />;
      case "tasks":
        return <TasksRoom {...common} />;
      case "resources":
        return <ResourcesRoom {...common} />;
      default:
        return (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <LayoutList className="h-6 w-6 text-[var(--color-text-muted)]" />
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Unsupported room type: {room.room_type}
            </p>
          </div>
        );
    }
  })();

  return (
    <ChannelWorkspace
      channel={channel}
      group={group}
      discussion={discussion}
      memberCount={memberCount}
      onlineCount={onlineCount}
      roomId={room.id}
      communityId={community.id}
      communitySlug={community.slug}
      userId={currentUserId}
      canManageKnowledge={channel.permissions.canModerate}
    />
  );
}
