"use client";

import { CommunityChats } from "@/components/community/community-chats";
import { ChatColumnHeader, ChatComposer } from "@/components/community/ChatThread";
import { ChatMessageBubble } from "@/components/community/ChatMessageBubble";
import { PinnedBanner, TypingIndicator } from "@/components/community/PinnedBanner";
import { CHAT_MESSAGES, MOCK_COMMUNITY, PINNED_MESSAGE } from "@/lib/community/dashboard-mock-data";
import { useWorkspace } from "@/components/community/workspace-context";

type CommunityChatPageProps = {
  slug: string;
  useLiveChat?: boolean;
};

export function CommunityChatPage({ useLiveChat = false }: CommunityChatPageProps) {
  const { overview, communityName } = useWorkspace();
  const online = overview?.membersOnline ?? MOCK_COMMUNITY.membersOnline;
  const name = communityName || MOCK_COMMUNITY.name;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-bg,#f4f4f5)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white lg:m-4 lg:rounded-2xl lg:shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
        <ChatColumnHeader
          title="# General Chat"
          subtitle={`${online.toLocaleString()} online · Chat with the ${name} community`}
        />
        <PinnedBanner author={PINNED_MESSAGE.author} text={PINNED_MESSAGE.text} />

        {useLiveChat ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <CommunityChats />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            {CHAT_MESSAGES.map((msg) => (
              <ChatMessageBubble key={msg.id} {...msg} />
            ))}
            <TypingIndicator name="Sarah Chen" />
          </div>
        )}

        {!useLiveChat && <ChatComposer />}
      </div>
    </div>
  );
}
