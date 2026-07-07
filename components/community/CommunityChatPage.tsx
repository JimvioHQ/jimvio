"use client";

import { CommunityChats } from "@/components/community/community-chats";
import { ChatColumnHeader, ChatComposer } from "@/components/community/ChatThread";
import { ChatMessageBubble } from "@/components/community/ChatMessageBubble";
import { CommunityRightRail } from "@/components/community/CommunityRightRail";
import { PinnedBanner, TypingIndicator } from "@/components/community/PinnedBanner";
import { CommunitySidebar } from "@/components/shell/CommunitySidebar";
import { CHAT_MESSAGES, MOCK_COMMUNITY, PINNED_MESSAGE } from "@/lib/community/dashboard-mock-data";
import { useWorkspace } from "@/components/community/workspace-context";

type CommunityChatPageProps = {
  slug: string;
  useLiveChat?: boolean;
};

export function CommunityChatPage({ slug, useLiveChat = false }: CommunityChatPageProps) {
  const { overview } = useWorkspace();
  const online = overview?.membersOnline ?? MOCK_COMMUNITY.membersOnline;

  return (
    <div className="flex h-full min-h-0 flex-1 bg-gray-50">
      <CommunitySidebar slug={slug} activeNav="chat" activeSpaceId="general" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1600px] flex-1 gap-0 overflow-hidden p-0 lg:gap-5 lg:p-4 lg:pl-0">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-white lg:rounded-xl lg:border lg:border-gray-200">
            <ChatColumnHeader
              title="# General Chat"
              subtitle={`${online.toLocaleString()} online · Chat with the ${MOCK_COMMUNITY.name} community`}
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

          <aside className="hidden w-[360px] shrink-0 overflow-y-auto xl:block">
            <CommunityRightRail />
          </aside>
        </div>
      </div>
    </div>
  );
}
