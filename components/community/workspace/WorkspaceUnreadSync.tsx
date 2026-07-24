"use client";

import { useWorkspaceUnreadSync } from "@/hooks/useWorkspaceUnreadSync";

/** Invisible mount point for community unread realtime (sidebar badges). */
export function WorkspaceUnreadSync({
  communityId,
  userId,
}: {
  communityId: string;
  userId: string;
}) {
  useWorkspaceUnreadSync({ communityId, userId });
  return null;
}
