"use client";

import React from "react";
import { ChatRoom } from "@/components/community/rooms/ChatRoom";
import { useWorkspace } from "@/components/community/workspace-context";

/**
 * A wrapper component that provides the first chat room context 
 * if none is explicitly provided.
 */
export function CommunityChats() {
  const { spacesWithRooms, communityId, slug } = useWorkspace();
  
  const firstChatRoom = spacesWithRooms
    .flatMap(s => s.rooms)
    .find(r => r.room_type === "chat");

  if (!firstChatRoom) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-[var(--color-text-muted)]">
        No chat rooms found in this community.
      </div>
    );
  }

  return (
    <ChatRoom 
      roomId={firstChatRoom.id}
      roomName={firstChatRoom.name}
      communityId={communityId}
      slug={slug}
      hideHeader={true}
    />
  );
}

