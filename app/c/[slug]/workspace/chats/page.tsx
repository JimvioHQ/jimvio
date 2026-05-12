"use client";

import { CommunityChats } from "@/components/community/community-chats";

export default function CommunityChatsPage() {
  return (
    <div className="flex-1 w-full h-full max-h-[100vh] min-h-0 flex flex-col">
      <CommunityChats />
    </div>
  );
}
