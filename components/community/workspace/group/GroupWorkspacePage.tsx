"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Layers, Lock } from "lucide-react";
import { useWorkspaceOptional } from "@/components/community/workspace-context";
import { resolveSpace } from "@/lib/community/workspace";
import { GroupWorkspace } from "./GroupWorkspace";
import { WorkspaceSkeleton } from "@/components/community/workspace/shared/WorkspaceSkeleton";
import { VisitTracker } from "@/components/community/personalization/VisitTracker";
import { communityGroupHref } from "@/lib/community/workspace/navigation";

function GroupStatusCard({
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

/**
 * First-class Group page — resolves by groupSlug only (never legacy space IDs in the URL).
 * Soft-fails with Not Found / access UI instead of crashing the route.
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

  if (!groupSlug) {
    return (
      <div className="flex flex-1 flex-col" aria-busy aria-label="Loading group">
        <WorkspaceSkeleton rows={6} className="min-h-[280px]" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <GroupStatusCard
        icon={Lock}
        title="Sign in to open this group"
        description="Group workspaces require an active community membership."
        actionLabel="Back to community"
        onAction={() => router.push(homeBase)}
      />
    );
  }

  if (!space) {
    return (
      <GroupStatusCard
        icon={Layers}
        title="Group not found"
        description="This group may have been renamed, archived, or removed. Check the community overview for current groups."
        actionLabel="Back to community"
        onAction={() => router.push(homeBase)}
      />
    );
  }

  // Prefer slug for URLs — never emit bare UUIDs in the address bar.
  const resolvedGroupSlug = space.slug?.trim() || groupSlug;
  if (!space.slug?.trim()) {
    return (
      <GroupStatusCard
        icon={Layers}
        title="Group unavailable"
        description="This group is missing a public slug and cannot be opened from a link. Ask an owner to republish it."
        actionLabel="Back to community"
        onAction={() => router.push(homeBase)}
      />
    );
  }

  const slug = communitySlug || workspace.slug;
  const groupHref = communityGroupHref(slug, resolvedGroupSlug);

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
