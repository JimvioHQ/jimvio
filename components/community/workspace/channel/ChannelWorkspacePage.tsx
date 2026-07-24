"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Hash, Lock } from "lucide-react";
import { useWorkspaceOptional } from "@/components/community/workspace-context";
import { RoomContent } from "@/components/community/workspace/room-content";
import { WorkspaceSkeleton } from "@/components/community/workspace/shared/WorkspaceSkeleton";
import {
  canEnterChannel,
  communityGroupHref,
  resolveSpaceAndRoom,
} from "@/lib/community/workspace";
import { communityChannelHref } from "@/lib/community/workspace/navigation";
import { VisitTracker } from "@/components/community/personalization/VisitTracker";

/**
 * First-class Channel page — resolves by channelSlug, finds parent Group
 * from the existing workspace loader (no extra fetch).
 */
export function ChannelWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const workspace = useWorkspaceOptional();

  const communitySlug =
    typeof params.slug === "string"
      ? params.slug
      : Array.isArray(params.slug)
        ? params.slug[0]
        : "";
  /** Optional — present only on legacy nested URLs before redirect. */
  const groupSlug =
    typeof params.groupSlug === "string"
      ? params.groupSlug
      : Array.isArray(params.groupSlug)
        ? params.groupSlug[0]
        : "";
  const channelSlug =
    typeof params.channelSlug === "string"
      ? params.channelSlug
      : Array.isArray(params.channelSlug)
        ? params.channelSlug[0]
        : "";

  const homeBase = `/communities/${communitySlug}`;

  const resolved = useMemo(() => {
    const spaces = workspace?.spacesWithRooms ?? [];
    return resolveSpaceAndRoom(spaces, groupSlug || null, channelSlug);
  }, [workspace?.spacesWithRooms, groupSlug, channelSlug]);

  const groupHref = resolved
    ? communityGroupHref(communitySlug, resolved.space.slug)
    : groupSlug
      ? communityGroupHref(communitySlug, groupSlug)
      : homeBase;

  if (!workspace) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
          Join this community to open channels
        </p>
        <button
          type="button"
          onClick={() => router.push(homeBase)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
        >
          Back to community <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (!channelSlug) {
    return (
      <div className="flex flex-1 flex-col" aria-busy aria-label="Loading channel">
        <WorkspaceSkeleton rows={6} className="min-h-[280px]" />
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
          <Hash className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
            Channel not found
          </p>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            This channel may have been renamed, archived, or removed. Try the
            community overview or a group workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(groupHref)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
        >
          {groupSlug ? "Back to group" : "Back to community"}{" "}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const { space, room } = resolved;
  const canEnter = canEnterChannel({
    room: { is_locked: room.is_locked, access_type: room.access_type },
    spaceAccessType: space.access_type,
    membership: workspace.membership ?? null,
    ownerId: workspace.ownerId,
    userId: workspace.userId,
    spaceId: space.id,
  });

  if (!canEnter) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
            Members-only channel
          </p>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Upgrade your plan to access {room.name}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/communities/${communitySlug}/subscribe`)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
        >
          See plans <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (!room.slug?.trim()) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
          <Hash className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
            Channel unavailable
          </p>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            This channel is missing a public slug and cannot be opened from a
            link.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(communityGroupHref(communitySlug, space.slug))}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
        >
          Back to group <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const slug = communitySlug || workspace.slug;
  const channelHref = communityChannelHref(slug, room.slug);
  const continueLearning =
    room.room_type === "course"
      ? ({ kind: "course" as const })
      : room.room_type === "resources" ||
          /resource|guide|pdf|knowledge/i.test(room.name)
        ? ({
            kind: /guide|knowledge|article/i.test(room.name)
              ? ("knowledge" as const)
              : ("resource" as const),
          })
        : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <VisitTracker
        id={room.id}
        kind="channel"
        communityId={workspace.communityId}
        title={room.name}
        href={channelHref}
        subtitle={space.name}
        continueLearning={continueLearning}
      />
      <RoomContent
        community={{
          id: workspace.communityId,
          slug,
          name: workspace.communityName,
          owner_id: workspace.ownerId ?? "",
          member_count: workspace.memberCount ?? 0,
          avatar_url: workspace.avatarUrl ?? null,
          cover_image: workspace.coverUrl ?? null,
        }}
        space={space}
        room={room}
        currentUserId={workspace.currentUserId || workspace.userId || ""}
        membership={workspace.membership ?? null}
        ownerId={workspace.ownerId ?? null}
        memberCount={workspace.overview?.memberCount ?? workspace.memberCount ?? 0}
        onlineCount={workspace.overview?.membersOnline ?? 0}
      />
    </div>
  );
}
