"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Hash, Layers, Lock } from "lucide-react";
import { useWorkspaceOptional } from "@/components/community/workspace-context";
import { GroupWorkspace } from "@/components/community/workspace/group/GroupWorkspace";
import { RoomContent } from "@/components/community/workspace/room-content";
import { WorkspaceSkeleton } from "@/components/community/workspace/shared/WorkspaceSkeleton";
import { VisitTracker } from "@/components/community/personalization/VisitTracker";
import {
  canEnterChannel,
  communitySpaceHref,
  resolveGroupDiscussionRoom,
  resolveSpace,
  resolveSpaceAndRoom,
} from "@/lib/community/workspace";

/**
 * Canonical Space route — /communities/[slug]/spaces/[spaceSlug]
 *
 * Flat resolve: room slug across the community → RoomContent;
 * otherwise Space slug → GroupWorkspace.
 */
export function SpaceWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const workspace = useWorkspaceOptional();

  const communitySlug =
    typeof params.slug === "string"
      ? params.slug
      : Array.isArray(params.slug)
        ? params.slug[0]
        : "";
  const spaceSlug =
    typeof params.spaceSlug === "string"
      ? params.spaceSlug
      : Array.isArray(params.spaceSlug)
        ? params.spaceSlug[0]
        : "";

  const homeBase = `/communities/${communitySlug}`;

  const roomHit = useMemo(() => {
    const spaces = workspace?.spacesWithRooms ?? [];
    return resolveSpaceAndRoom(spaces, null, spaceSlug);
  }, [workspace?.spacesWithRooms, spaceSlug]);

  const spaceHit = useMemo(() => {
    if (roomHit) return null;
    return resolveSpace(workspace?.spacesWithRooms ?? [], spaceSlug);
  }, [workspace?.spacesWithRooms, spaceSlug, roomHit]);

  if (!spaceSlug) {
    return (
      <div className="flex flex-1 flex-col" aria-busy aria-label="Loading space">
        <WorkspaceSkeleton rows={6} className="min-h-[280px]" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <StatusCard
        icon={Lock}
        title="Sign in to open this Space"
        description="Spaces require an active community membership."
        actionLabel="Back to community"
        onAction={() => router.push(homeBase)}
      />
    );
  }

  // Room match (flat Space-area URL) → ChannelWorkspace behavior
  if (roomHit) {
    const { space, room } = roomHit;
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
        <StatusCard
          icon={Lock}
          title="Members-only space"
          description={`Upgrade your plan to access ${room.name}.`}
          actionLabel="See plans"
          onAction={() =>
            router.push(`/communities/${communitySlug}/subscribe`)
          }
        />
      );
    }

    if (!room.slug?.trim()) {
      return (
        <StatusCard
          icon={Hash}
          title="Space unavailable"
          description="This room is missing a public slug and cannot be opened from a link."
          actionLabel="Back to space"
          onAction={() =>
            router.push(communitySpaceHref(communitySlug, space.slug))
          }
        />
      );
    }

    const slug = communitySlug || workspace.slug;
    const href = communitySpaceHref(slug, room.slug);
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
          href={href}
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
          memberCount={
            workspace.overview?.memberCount ?? workspace.memberCount ?? 0
          }
          onlineCount={workspace.overview?.membersOnline ?? 0}
        />
      </div>
    );
  }

  // Space match → open primary discussion chat directly
  if (spaceHit) {
    if (!spaceHit.slug?.trim()) {
      return (
        <StatusCard
          icon={Layers}
          title="Space unavailable"
          description="This Space is missing a public slug and cannot be opened from a link. Ask an owner to republish it."
          actionLabel="Back to community"
          onAction={() => router.push(homeBase)}
        />
      );
    }

    const discussionRoomLite = resolveGroupDiscussionRoom(spaceHit.rooms);
    const slug = communitySlug || workspace.slug;
    const spaceHref = communitySpaceHref(slug, spaceHit.slug);

    if (discussionRoomLite) {
      const discussionRoom =
        spaceHit.rooms.find((r) => r.id === discussionRoomLite.id) ??
        discussionRoomLite;
      const canEnter = canEnterChannel({
        room: {
          is_locked: discussionRoom.is_locked,
          access_type: discussionRoom.access_type,
        },
        spaceAccessType: spaceHit.access_type,
        membership: workspace.membership ?? null,
        ownerId: workspace.ownerId,
        userId: workspace.userId,
        spaceId: spaceHit.id,
      });

      if (!canEnter) {
        return (
          <StatusCard
            icon={Lock}
            title="Members-only space"
            description={`Upgrade your plan to access ${spaceHit.name}.`}
            actionLabel="See plans"
            onAction={() =>
              router.push(`/communities/${communitySlug}/subscribe`)
            }
          />
        );
      }

      if (!discussionRoom.slug?.trim()) {
        return (
          <StatusCard
            icon={Hash}
            title="Discussion unavailable"
            description="This Space is missing a discussion channel slug."
            actionLabel="Back to community"
            onAction={() => router.push(homeBase)}
          />
        );
      }

      return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <VisitTracker
            id={discussionRoom.id}
            kind="channel"
            communityId={workspace.communityId}
            title={spaceHit.name}
            href={spaceHref}
            subtitle={workspace.communityName}
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
            space={spaceHit}
            room={discussionRoom}
            currentUserId={workspace.currentUserId || workspace.userId || ""}
            membership={workspace.membership ?? null}
            ownerId={workspace.ownerId ?? null}
            memberCount={
              workspace.overview?.memberCount ?? workspace.memberCount ?? 0
            }
            onlineCount={workspace.overview?.membersOnline ?? 0}
          />
        </div>
      );
    }

    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <VisitTracker
          id={spaceHit.id}
          kind="group"
          communityId={workspace.communityId}
          title={spaceHit.name}
          href={spaceHref}
          subtitle={`${spaceHit.rooms.length} rooms`}
        />
        <GroupWorkspace
          space={spaceHit}
          communityId={workspace.communityId}
          communitySlug={slug}
          ownerId={workspace.ownerId}
          userId={workspace.userId}
          membership={workspace.membership ?? null}
          memberCount={
            workspace.overview?.memberCount ?? workspace.memberCount ?? 0
          }
          isStaff={Boolean(workspace.isAdmin || workspace.isOwner)}
          ownerName={workspace.ownerName}
        />
      </div>
    );
  }

  return (
    <StatusCard
      icon={Layers}
      title="Space not found"
      description="This Space may have been renamed, archived, or removed. Check the community overview for current Spaces."
      actionLabel="Back to community"
      onAction={() => router.push(homeBase)}
    />
  );
}

function StatusCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: typeof Layers;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
          {title}
        </p>
        <p className="mt-1 max-w-sm text-[13px] text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
      >
        {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
