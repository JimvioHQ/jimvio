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

  const readOnlyCopy = useMemo(() => {
    const restricted =
      posting && !posting.canPublish && Boolean(userId) && membership?.status === "active";
    if (!restricted) return null;
    return {
      title: "Only admins can send messages in this Space.",
      description:
        "You can read the conversation and scroll history. Messaging is limited to community admins.",
    };
  }, [posting, userId, membership?.status]);

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
            readOnlyTitle={readOnlyCopy?.title}
            readOnlyDescription={readOnlyCopy?.description}
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
