"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LayoutList, Radio } from "lucide-react";
import type { WorkspaceCommunity } from "@/types/workspace";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import { ChatRoom } from "../chat/ChatRoom";
import { PostsRoom } from "../rooms/PostsRoom";
import { CourseRoom } from "../rooms/CourseRoom";
import { TasksRoom } from "../rooms/TasksRoom";
import { ResourcesRoom } from "../rooms/ResourcesRoom";
import { ChannelWorkspace } from "@/components/community/workspace/channel";
import { GroupHeader } from "@/components/community/workspace/group/GroupHeader";
import {
  mapRoomToChannel,
  mapSpaceToGroup,
  resolveChannelEmptyCopy,
  resolveSpaceAvatarSrc,
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
        cover: resolveSpaceAvatarSrc(
          space,
          community.avatar_url,
          community.cover_image
        ),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [space, currentUserId, ownerId, membership, memberCount, onlineCount, community.avatar_url, community.cover_image]
  );

  const emptyCopy = useMemo(
    () =>
      resolveChannelEmptyCopy({
        type: channel.type,
        name: channel.name,
        channelKind: room.channel_kind ?? null,
      }),
    [channel.type, channel.name, room.channel_kind]
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
        return (
          <PostsRoom
            {...common}
            canPost={channel.canPublish}
            emptyTitle={emptyCopy.emptyTitle}
            emptyDescription={emptyCopy.emptyDescription}
            emptyActionLabel={emptyCopy.emptyActionLabel}
            readOnlyTitle={emptyCopy.readOnlyTitle}
            readOnlyDescription={emptyCopy.readOnlyDescription}
          />
        );
      case "chat":
        return (
          <ChatRoom
            {...common}
            canPost={channel.canPublish}
            emptyTitle={emptyCopy.emptyTitle}
            emptyDescription={emptyCopy.emptyDescription}
            emptyActionLabel={emptyCopy.emptyActionLabel}
            readOnlyTitle={emptyCopy.readOnlyTitle}
            readOnlyDescription={emptyCopy.readOnlyDescription}
          />
        );
      case "course":
        return <CourseRoom {...common} />;
      case "tasks":
        return <TasksRoom {...common} />;
      case "resources":
        return <ResourcesRoom {...common} />;
      case "live":
      case "voice":
        return (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <Radio className="h-7 w-7 text-[var(--color-accent)]" />
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Live Studio
            </p>
            <p className="max-w-sm text-[13px] text-[var(--color-text-muted)]">
              Host and join live sessions from Live Studio. Discussion stays available in this
              group when you return.
            </p>
            <Link
              href={`/communities/${community.slug}/live`}
              className="mt-1 inline-flex rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              Open Live Studio
            </Link>
          </div>
        );
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

  if (room.room_type === "chat") {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-bg,#f4f4f5)]">
        <GroupHeader group={group} compact />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {discussion}
        </div>
      </div>
    );
  }

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
