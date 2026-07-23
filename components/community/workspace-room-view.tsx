// components/community/workspace-room-view.tsx
"use client";

import React, { useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { useWorkspaceOptional } from "@/components/community/workspace-context";
import { WorkspaceRoomOverlay } from "@/components/community/workspace-room-overlay";
import { PostsRoom } from "@/components/community/rooms/PostsRoom";
import { CourseRoom } from "@/components/community/rooms/CourseRoom";
import { TasksRoom } from "@/components/community/rooms/TasksRoom";
import { ResourcesRoom } from "@/components/community/rooms/ResourcesRoom";
import { ChatRoom } from "./chat/ChatRoom";
import { ChannelWorkspace } from "@/components/community/workspace/channel";
import {
  canEnterChannel,
  mapRoomToChannel,
  mapSpaceToGroup,
} from "@/lib/community/workspace";

export function WorkspaceRoomView() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug =
    typeof params.slug === "string"
      ? params.slug
      : Array.isArray(params.slug)
        ? params.slug[0]
        : "";
  const workspace = useWorkspaceOptional();
  const spacesWithRooms = workspace?.spacesWithRooms ?? [];
  const communityId = workspace?.communityId ?? "";
  const communityName = workspace?.communityName ?? "";
  const ownerId = workspace?.ownerId ?? "";
  const userId = workspace?.userId ?? "";
  const membership = workspace?.membership ?? null;
  const memberCount = workspace?.memberCount ?? 0;
  const overview = workspace?.overview ?? null;

  const spaceId = searchParams.get("space") || "";
  const roomId = searchParams.get("room") || "";

  const resolved = useMemo(() => {
    for (const s of spacesWithRooms) {
      const r = s.rooms.find((x) => x.id === roomId);
      if (r && s.id === spaceId) return { space: s, room: r };
    }
    for (const s of spacesWithRooms) {
      const r = s.rooms.find((x) => x.id === roomId);
      if (r) return { space: s, room: r };
    }
    return null;
  }, [spacesWithRooms, spaceId, roomId]);

  const homeBase = `/communities/${slug}`;

  function closeRoomOverlay() {
    router.push(homeBase);
  }

  if (!workspace) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
          Join this community to open rooms
        </p>
        <button
          type="button"
          onClick={() => router.push(homeBase)}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#fd5000] px-4 py-2 text-[13px] font-semibold text-white"
        >
          Back to community <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (!spaceId || !roomId) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-[13px] text-[var(--color-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-[14px] font-medium text-[var(--color-text-primary)]">Room not found</p>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          It may have been removed or moved to another space.
        </p>
        <button
          type="button"
          onClick={() => router.push(homeBase)}
          className="inline-flex h-9 items-center gap-1 px-4 text-[13px] font-medium text-white"
          style={{
            background: "var(--color-accent)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          Back to community <ArrowRight size={13} />
        </button>
      </div>
    );
  }

  const { space, room } = resolved;
  const roleInput = { userId, ownerId, membership };
  const canEnter = canEnterChannel({
    room: { is_locked: room.is_locked, access_type: room.access_type },
    spaceAccessType: space.access_type,
    membership,
    ownerId,
    userId,
    spaceId: space.id,
  });

  if (!canEnter) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div
          className="flex h-12 w-12 items-center justify-center"
          style={{
            background: "var(--color-surface-secondary)",
            color: "var(--color-text-muted)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
            Members-only room
          </p>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Upgrade your plan to access {room.name}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/communities/${slug}/subscribe`)}
          className="inline-flex h-9 items-center gap-1 px-4 text-[13px] font-medium text-white"
          style={{
            background: "var(--color-accent)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          See plans <ArrowRight size={13} />
        </button>
      </div>
    );
  }

  const channel = mapRoomToChannel(room, roleInput);
  const group = mapSpaceToGroup(space, roleInput, {
    memberCount: overview?.memberCount ?? memberCount ?? 0,
    onlineCount: overview?.membersOnline ?? 0,
  });

  const common = {
    roomId: room.id,
    roomName: room.name,
    communityId,
    slug,
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
          <div className="flex flex-1 items-center justify-center p-8 text-[13px] text-[var(--color-text-muted)]">
            Unsupported room type: {room.room_type}
          </div>
        );
    }
  })();

  return (
    <WorkspaceRoomOverlay
      communityName={communityName}
      spaceName={space.name}
      spaceIconName={space.icon}
      roomName={room.name}
      roomType={room.room_type}
      onClose={closeRoomOverlay}
    >
      <ChannelWorkspace
        channel={channel}
        group={group}
        discussion={discussion}
        memberCount={overview?.memberCount ?? memberCount}
        onlineCount={overview?.membersOnline ?? 0}
        roomId={room.room_type === "chat" ? room.id : undefined}
        communityId={communityId}
        canManageKnowledge={channel.permissions.canModerate}
      />
    </WorkspaceRoomOverlay>
  );
}
