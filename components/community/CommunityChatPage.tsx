"use client";

import { CommunityChats } from "@/components/community/community-chats";
import { useWorkspaceOptional } from "@/components/community/workspace-context";

type CommunityChatPageProps = {
  slug: string;
};

export function CommunityChatPage({ slug }: CommunityChatPageProps) {
  const workspace = useWorkspaceOptional();

  if (!workspace) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[var(--color-bg)] text-sm text-[var(--color-text-muted)]">
        <a
          href={`/communities/${slug}`}
          className="font-semibold text-[var(--color-accent)] hover:underline"
        >
          Join this community to open chat
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-bg)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-surface)] lg:m-4 lg:rounded-2xl lg:shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
        <div className="min-h-0 flex-1 overflow-hidden">
          <CommunityChats />
        </div>
      </div>
    </div>
  );
}
