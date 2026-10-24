"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  communitySpaceHref,
  mapRoomToChannel,
  mapSpaceToGroup,
  resolveGroupDiscussionRoom,
  resolveSpaceAvatarSrc,
  type WorkspaceGroup,
} from "@/lib/community/workspace";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import type { MembershipLite } from "@/lib/community-workspace-access";
import { ChatRoom } from "@/components/community/chat/ChatRoom";
import { WorkspaceSkeleton } from "@/components/community/workspace/shared/WorkspaceSkeleton";
import { SpaceSettingsDialog } from "@/components/community/workspace/space/SpaceSettingsDialog";
import { discussionComposerGate } from "@/lib/community/workspace/discussion-composer";
import { isAnnouncementOnlyRoom, isGroupDiscussionRoom } from "@/lib/community/workspace/channel-posting";
import { buildHubLoginUrl } from "@/lib/community/hub-auth";
import { GroupHeader } from "./GroupHeader";

type DiscussionRoom = WorkspaceSpaceRow["rooms"][number];

/**
 * Member Space experience — discussion-first: header + messages only.
 */
export function GroupWorkspace({
  space,
  communityId,
  communitySlug,
  ownerId,
  userId,
  membership,
  memberCount,
  isStaff,
  isFree = null,
  ownerName: _ownerName,
  communityAvatar,
  communityCover,
}: {
  space: WorkspaceSpaceRow;
  communityId: string;
  communitySlug: string;
  ownerId: string | null | undefined;
  userId: string | null | undefined;
  membership: MembershipLite | null;
  memberCount?: number;
  isStaff?: boolean;
  isFree?: boolean | null;
  ownerName?: string | null;
  communityAvatar?: string | null;
  communityCover?: string | null;
}) {
  const router = useRouter();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ensuredRoom, setEnsuredRoom] = useState<DiscussionRoom | null>(null);
  const [ensuring, setEnsuring] = useState(false);
  const [ensureError, setEnsureError] = useState<string | null>(null);
  const [ensureAttempt, setEnsureAttempt] = useState(0);
  const [joining, setJoining] = useState(false);

  const roleInput = useMemo(
    () => ({ userId, ownerId, membership }),
    [userId, ownerId, membership]
  );

  const avatarSrc = useMemo(
    () => resolveSpaceAvatarSrc(space, communityAvatar, communityCover),
    [space, communityAvatar, communityCover]
  );

  const group: WorkspaceGroup = useMemo(
    () =>
      mapSpaceToGroup(space, roleInput, {
        memberCount: memberCount ?? space.member_count ?? 0,
        onlineCount: 0,
        description: space.description ?? null,
        color: space.color ?? null,
        cover: avatarSrc,
      }),
    [space, roleInput, memberCount, avatarSrc]
  );

  const resolvedFromSpace = useMemo(
    () => resolveGroupDiscussionRoom(space.rooms),
    [space.rooms]
  );
  const discussionRoom = resolvedFromSpace ?? ensuredRoom;

  const posting = useMemo(() => {
    if (!discussionRoom) return null;
    return mapRoomToChannel(discussionRoom, roleInput);
  }, [discussionRoom, roleInput]);

  const canPost = Boolean(
    userId &&
      (membership?.status === "active" || isStaff) &&
      membership?.status !== "cancelled" &&
      posting?.canPublish
  );

  const memberDiscussion = Boolean(
    discussionRoom &&
      isGroupDiscussionRoom(discussionRoom) &&
      !isAnnouncementOnlyRoom(discussionRoom)
  );

  const composerGate = useMemo(
    () =>
      discussionComposerGate({
        userId,
        membershipStatus: membership?.status,
        isStaff,
        canPublish: Boolean(posting?.canPublish),
        isFree,
        memberDiscussion,
      }),
    [userId, membership?.status, isStaff, posting?.canPublish, isFree, memberDiscussion]
  );

  const joinCommunity = useCallback(async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/communities/${communitySlug}/join`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(payload?.error || "Could not join this community");
      toast.success("You joined this community");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join this community");
    } finally {
      setJoining(false);
    }
  }, [communitySlug, router]);

  useEffect(() => {
    if (resolvedFromSpace || ensuredRoom) return;
    let cancelled = false;
    setEnsuring(true);
    setEnsureError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/rooms/${space.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ensure_discussion: true }),
        });
        const data = (await res.json()) as {
          room?: DiscussionRoom;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.room) {
          setEnsureError(data.error ?? "Could not open discussion");
          return;
        }
        setEnsuredRoom(data.room);
        router.refresh();
      } catch {
        if (!cancelled) setEnsureError("Could not open discussion");
      } finally {
        if (!cancelled) setEnsuring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedFromSpace, ensuredRoom, space.id, ensureAttempt, router]);

  const copyInvite = useCallback(() => {
    const href = communitySpaceHref(communitySlug, space.slug);
    void navigator.clipboard?.writeText(
      `${typeof window !== "undefined" ? window.location.origin : ""}${href}`
    );
    toast.success("Invite link copied");
  }, [communitySlug, space.slug]);

  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden",
        "bg-[#F8FAFC]",
        "animate-in fade-in duration-300"
      )}
    >
      <GroupHeader
        group={group}
        isMember={Boolean(membership)}
        notificationsOn={notificationsOn}
        spaceType={space.space_type}
        verified={Boolean(space.is_featured)}
        compact
        onSettings={isStaff ? () => setSettingsOpen(true) : undefined}
        onToggleNotifications={() => {
          const next = !notificationsOn;
          const previous = notificationsOn;
          setNotificationsOn(next);
          void fetch(`/api/c/${communityId}/mute`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ muted: !next, spaceId: space.id }),
          })
            .then(async (res) => {
              if (!res.ok) {
                const payload = await res.json().catch(() => null);
                throw new Error(payload?.error || "Mute failed");
              }
              toast.success(next ? "Notifications on" : "Space notifications muted");
            })
            .catch((err: unknown) => {
              setNotificationsOn(previous);
              toast.error(err instanceof Error ? err.message : "Mute failed");
            });
        }}
        onInvite={copyInvite}
        onJoin={() => router.push(`/communities/${communitySlug}/subscribe`)}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {discussionRoom ? (
          <ChatRoom
            roomId={discussionRoom.id}
            roomName={space.name}
            communityId={communityId}
            slug={communitySlug}
            hideHeader
            hideSidebar
            discussionLayout
            canPost={canPost}
            emptyTitle="No messages yet"
            emptyDescription="Start the conversation with the Space."
            readOnlyTitle={composerGate.kind === "compose" ? undefined : composerGate.title}
            readOnlyDescription={composerGate.kind === "compose" ? undefined : composerGate.description}
            readOnlyAction={
              composerGate.kind === "join" ? (
                <button
                  type="button"
                  disabled={joining}
                  onClick={() => void joinCommunity()}
                  className="inline-flex min-h-9 items-center rounded-xl bg-[#fd5000] px-4 text-[12px] font-semibold text-white disabled:opacity-60"
                >
                  {joining ? "Joining…" : composerGate.actionLabel}
                </button>
              ) : composerGate.kind === "subscribe" ? (
                <a
                  href={`/communities/${communitySlug}/subscribe`}
                  className="inline-flex min-h-9 items-center rounded-xl bg-[#fd5000] px-4 text-[12px] font-semibold text-white"
                >
                  {composerGate.actionLabel}
                </a>
              ) : composerGate.kind === "sign-in" ? (
                <a
                  href={buildHubLoginUrl(`/communities/${communitySlug}/spaces/${space.slug}`)}
                  className="inline-flex min-h-9 items-center rounded-xl bg-[#fd5000] px-4 text-[12px] font-semibold text-white"
                >
                  {composerGate.actionLabel}
                </a>
              ) : null
            }
          />
        ) : ensuring ? (
          <WorkspaceSkeleton rows={8} className="min-h-[320px]" />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
            <p className="text-[15px] font-semibold text-[#111827]">
              {ensureError ?? `Opening ${group.name}…`}
            </p>
            {ensureError ? (
              <button
                type="button"
                onClick={() => {
                  setEnsuredRoom(null);
                  setEnsureError(null);
                  setEnsureAttempt((n) => n + 1);
                }}
                className="inline-flex min-h-11 items-center rounded-xl bg-[#FF5A1F] px-5 text-[13px] font-semibold text-white"
              >
                Retry
              </button>
            ) : null}
          </div>
        )}
      </div>

      {isStaff ? (
        <SpaceSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          spaceId={space.id}
          discussionRoomId={discussionRoom?.id}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
