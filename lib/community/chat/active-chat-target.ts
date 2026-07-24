"use client";

/**
 * Tracks which room/DM is currently open so workspace-level unread
 * sync can skip bumping the active conversation.
 */

let activeRoomId: string | null = null;
let activeConvId: string | null = null;

export function setActiveChatTarget(opts: {
  roomId?: string | null;
  convId?: string | null;
}): void {
  activeRoomId = opts.roomId ?? null;
  activeConvId = opts.convId ?? null;
}

export function getActiveChatTarget(): {
  roomId: string | null;
  convId: string | null;
} {
  return { roomId: activeRoomId, convId: activeConvId };
}

export function bumpWorkspaceUnread(keyId: string): void {
  if (typeof window === "undefined" || !keyId) return;
  try {
    const k = `workspace-unread:${keyId}`;
    localStorage.setItem(
      k,
      String(parseInt(localStorage.getItem(k) ?? "0", 10) + 1)
    );
    window.dispatchEvent(new Event("storage"));
  } catch {
    /* ignore quota / private mode */
  }
}
