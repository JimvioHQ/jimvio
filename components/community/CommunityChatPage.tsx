"use client";

import { CommunityChats } from "@/components/community/community-chats";
import { useWorkspaceOptional } from "@/components/community/workspace-context";

type CommunityChatPageProps = {
  slug: string;
  /** @deprecated Always uses live chat — retained for call-site compatibility. */
  useLiveChat?: boolean;
};

/** Community chat — live ChatRoom only. Never renders fabricated message history. */
export function CommunityChatPage({ slug }: CommunityChatPageProps) {
  const workspace = useWorkspaceOptional();

  if (!workspace) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[var(--color-bg,#f4f4f5)] text-sm text-[var(--color-text-muted)]">
        <a href={`/communities/${slug}`} className="font-semibold text-[#fd5000] hover:underline">
          Join this community to open chat
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-bg,#f4f4f5)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white lg:m-4 lg:rounded-2xl lg:shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
        <div className="min-h-0 flex-1 overflow-hidden">
          <CommunityChats />
        </div>
      </div>
    </div>
  );
}
