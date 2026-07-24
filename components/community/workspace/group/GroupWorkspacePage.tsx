"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Layers } from "lucide-react";
import { useWorkspaceOptional } from "@/components/community/workspace-context";
import { resolveSpace } from "@/lib/community/workspace";
import { GroupWorkspace } from "./GroupWorkspace";
import { WorkspaceSkeleton } from "@/components/community/workspace/shared/WorkspaceSkeleton";
import { VisitTracker } from "@/components/community/personalization/VisitTracker";
import { communityGroupHref } from "@/lib/community/workspace/navigation";

/**
 * First-class Group page — resolves by slug, never hard-errors.
 */
export function GroupWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const workspace = useWorkspaceOptional();

  const communitySlug =
    typeof params.slug === "string"
      ? params.slug
      : Array.isArray(params.slug)
        ? params.slug[0]
        : "";
  const groupSlug =
    typeof params.groupSlug === "string"
      ? params.groupSlug
      : Array.isArray(params.groupSlug)
        ? params.groupSlug[0]
        : "";

  const homeBase = `/communities/${communitySlug}`;

  const space = useMemo(
    () => resolveSpace(workspace?.spacesWithRooms ?? [], groupSlug),
    [workspace?.spacesWithRooms, groupSlug]
  );

  if (!workspace) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
          Join this community to open groups
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

  if (!groupSlug) {
    return (
      <div className="flex flex-1 flex-col" aria-busy aria-label="Loading group">
        <WorkspaceSkeleton rows={6} className="min-h-[280px]" />
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
            Group unavailable
          </p>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            It may have been renamed or removed. Head back to the community hub.
          </p>
        </div>
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

  const slug = communitySlug || workspace.slug;
  const groupHref = communityGroupHref(slug, space.slug);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <VisitTracker
        id={space.id}
        kind="group"
        communityId={workspace.communityId}
        title={space.name}
        href={groupHref}
        subtitle={`${space.rooms.length} channels`}
      />
      <GroupWorkspace
        space={space}
        communityId={workspace.communityId}
        communitySlug={slug}
        ownerId={workspace.ownerId}
        userId={workspace.userId}
        membership={workspace.membership ?? null}
        memberCount={workspace.overview?.memberCount ?? workspace.memberCount ?? 0}
        isStaff={Boolean(workspace.isAdmin || workspace.isOwner)}
        ownerName={workspace.ownerName}
      />
    </div>
  );
}
