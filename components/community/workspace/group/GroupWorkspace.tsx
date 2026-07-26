"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  communitySpaceHref,
  mapSpaceToGroup,
  resolveGroupDiscussionRoom,
  type WorkspaceGroup,
} from "@/lib/community/workspace";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import type { MembershipLite } from "@/lib/community-workspace-access";
import { useCommunityRoster } from "@/components/community/workspace/shared/useCommunityRoster";
import { ChatRoom } from "@/components/community/chat/ChatRoom";
import { WorkspaceSkeleton } from "@/components/community/workspace/shared/WorkspaceSkeleton";
import { SpaceAboutPanel } from "@/components/community/workspace/space/SpaceAboutPanel";
import {
  SpaceViewTabs,
  type SpaceViewTab,
} from "@/components/community/workspace/space/SpaceViewChrome";
import { MembersPanel } from "@/components/community/workspace/channel/panels/MembersPanel";
import { FilesPanel } from "@/components/community/workspace/channel/panels/FilesPanel";
import { FeedSection } from "@/components/community/workspace/sections/Feed";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import { GroupHeader } from "./GroupHeader";

type DiscussionRoom = WorkspaceSpaceRow["rooms"][number];

/**
 * Member Space experience — clean header, tabs, call panel, conversation.
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
  ownerName,
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
}) {
  const router = useRouter();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [tab, setTab] = useState<SpaceViewTab>("discussion");
  const { members } = useCommunityRoster(communityId);
  const [ensuredRoom, setEnsuredRoom] = useState<DiscussionRoom | null>(null);
  const [ensuring, setEnsuring] = useState(false);
  const [ensureError, setEnsureError] = useState<string | null>(null);
  const [ensureAttempt, setEnsureAttempt] = useState(0);
  const requestSearch = useRoomMessageIndex((s) => s.requestSearch);
  const requestCall = useRoomMessageIndex((s) => s.requestCall);

  const roleInput = useMemo(
    () => ({ userId, ownerId, membership }),
    [userId, ownerId, membership]
  );

  const group: WorkspaceGroup = useMemo(
    () =>
      mapSpaceToGroup(space, roleInput, {
        memberCount: memberCount ?? members.length,
        onlineCount: 0,
        description: space.description ?? null,
        color: space.color ?? null,
      }),
    [space, roleInput, memberCount, members.length]
  );

  const resolvedFromSpace = useMemo(
    () => resolveGroupDiscussionRoom(space.rooms),
    [space.rooms]
  );
  const discussionRoom = resolvedFromSpace ?? ensuredRoom;

  const canPost =
    Boolean(userId) &&
    Boolean(membership?.status === "active" || isStaff) &&
    membership?.status !== "cancelled";

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
          setEnsureError(data.error ?? "Could not open Discussion");
          return;
        }
        setEnsuredRoom(data.room);
        router.refresh();
      } catch {
        if (!cancelled) setEnsureError("Could not open Discussion");
      } finally {
        if (!cancelled) setEnsuring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedFromSpace, ensuredRoom, space.id, ensureAttempt, router]);

  const aboutMembers = useMemo(
    () =>
      members.map((m) => ({
        id: m.id,
        name: m.name,
        avatarUrl: m.avatarUrl,
        role: m.role,
      })),
    [members]
  );

  const copyInvite = useCallback(() => {
    const href = communitySpaceHref(communitySlug, space.slug);
    void navigator.clipboard?.writeText(
      `${typeof window !== "undefined" ? window.location.origin : ""}${href}`
    );
    toast.success("Invite link copied");
  }, [communitySlug, space.slug]);

  const handleTabChange = useCallback((next: SpaceViewTab) => {
    if (next === "about") {
      setAboutOpen(true);
      setTab("discussion");
      return;
    }
    setTab(next);
  }, []);

  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-white",
        "animate-in fade-in duration-300"
      )}
    >
      <GroupHeader
        group={group}
        ownerName={ownerName}
        isMember={Boolean(membership)}
        notificationsOn={notificationsOn}
        spaceType={space.space_type}
        verified={Boolean(space.is_featured)}
        compact
        onToggleNotifications={() => {
          setNotificationsOn((v) => !v);
          toast.success(
            notificationsOn ? "Space notifications muted" : "Notifications on"
          );
        }}
        onInvite={copyInvite}
        onAbout={() => setAboutOpen(true)}
        onSearch={() => {
          setTab("discussion");
          requestSearch();
        }}
        onAudioCall={() => {
          setTab("discussion");
          requestCall("audio");
        }}
        onVideoCall={() => {
          setTab("discussion");
          requestCall("video");
        }}
        onJoin={() => router.push(`/communities/${communitySlug}/subscribe`)}
      />

      <SpaceViewTabs
        active={tab}
        memberCount={group.memberCount || members.length}
        onChange={handleTabChange}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        {tab === "discussion" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {discussionRoom ? (
              <ChatRoom
                roomId={discussionRoom.id}
                roomName={discussionRoom.name}
                communityId={communityId}
                slug={communitySlug}
                hideHeader
                hideSidebar
                discussionLayout
                canPost={canPost}
                emptyTitle={`Welcome to ${group.name}`}
                emptyDescription="Start the conversation — messages, replies, reactions, and files live here."
                emptyActionLabel="Write a message"
              />
            ) : ensuring ? (
              <WorkspaceSkeleton rows={8} className="min-h-[320px]" />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
                <p className="text-[16px] font-semibold text-gray-900">
                  Welcome to {group.name}
                </p>
                <p className="max-w-sm text-[13px] leading-relaxed text-gray-500">
                  Start the first conversation.
                </p>
                {ensureError ? (
                  <p className="text-[12px] text-red-600">{ensureError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setEnsuredRoom(null);
                    setEnsureError(null);
                    setEnsureAttempt((n) => n + 1);
                  }}
                  className="inline-flex min-h-10 items-center rounded-lg bg-[#fd5000] px-4 text-[13px] font-semibold text-white"
                >
                  Retry Discussion
                </button>
              </div>
            )}
          </div>
        ) : null}

        {tab === "members" ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 sm:p-6">
            <MembersPanel members={members} />
          </div>
        ) : null}

        {tab === "files" ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 sm:p-6">
            <FilesPanel
              roomId={discussionRoom?.id}
              canManage={Boolean(isStaff)}
              onOpenDiscussion={() => setTab("discussion")}
            />
          </div>
        ) : null}

        {tab === "posts" ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 sm:p-6">
            <FeedSection communityId={communityId} filter="for-you" />
          </div>
        ) : null}
      </div>

      <SpaceAboutPanel
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        group={group}
        spaceType={space.space_type}
        ownerName={ownerName}
        createdAt={space.created_at}
        description={space.description}
        rules={group.rules}
        members={aboutMembers}
        onViewDetails={() => {
          setAboutOpen(false);
          setTab("members");
        }}
      />
    </div>
  );
}
