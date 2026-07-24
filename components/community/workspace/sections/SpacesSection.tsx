"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Plus } from "lucide-react";
import { toast } from "sonner";
import { CreateSpaceDialog } from "@/components/community/CreateSpaceDialog";
import { useWorkspace, type WorkspaceSpaceRow } from "@/components/community/workspace-context";
import type { WorkspaceCommunity } from "@/types/workspace";
import { GroupCard } from "@/components/community/workspace/group/GroupCard";
import { ChannelEmptyState } from "@/components/community/workspace/channel/ChannelEmptyState";
import { useWorkspaceFavorites } from "@/components/community/workspace/shared/useWorkspaceFavorites";
import {
  communityGroupHref,
  mapSpaceToGroup,
} from "@/lib/community/workspace";

interface Props {
  community: WorkspaceCommunity;
  spacesWithRooms: WorkspaceSpaceRow[];
  isAdmin?: boolean;
  isOwner?: boolean;
}

/**
 * Premium Groups gallery — collaboration spaces, not accordion lists.
 * Opens canonical /groups/[groupSlug] routes.
 */
export function SpacesSection({
  community,
  spacesWithRooms,
  isAdmin = false,
  isOwner = false,
}: Props) {
  const router = useRouter();
  const {
    ownerId,
    userId,
    membership,
    memberCount,
    overview,
  } = useWorkspace();
  const { isFavorite, toggleFavorite } = useWorkspaceFavorites();
  const [createOpen, setCreateOpen] = useState(false);

  const canCreate = isOwner || isAdmin;

  const groups = useMemo(() => {
    const roleInput = { userId, ownerId, membership };
    const online = overview?.membersOnline ?? 0;
    return spacesWithRooms.map((space, index) => {
      const mapped = mapSpaceToGroup(space, roleInput, {
        memberCount: memberCount ?? 0,
        onlineCount:
          online > 0
            ? Math.max(1, Math.round(online / Math.max(spacesWithRooms.length, 1)))
            : 0,
        featured: index === 0,
        tags: space.access_type === "paid" ? ["Premium"] : ["Open"],
      });
      return { space, group: mapped };
    });
  }, [
    spacesWithRooms,
    userId,
    ownerId,
    membership,
    memberCount,
    overview?.membersOnline,
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <CreateSpaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        communityId={community.id}
        onCreated={() => router.refresh()}
      />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            Collaboration spaces
          </p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[26px]">
            Groups
          </h2>
          <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
            Premium workspaces for channels, knowledge, courses, and live
            sessions — open a group before you enter a discussion.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create group
          </button>
        )}
      </header>

      {groups.length === 0 ? (
        <ChannelEmptyState
          icon={Layers}
          title="No groups yet"
          description={
            canCreate
              ? "Create the first group to organize channels and collaboration."
              : "This community has not published groups yet. Check back soon."
          }
          actionLabel={canCreate ? "Create the first group" : undefined}
          onAction={canCreate ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map(({ space, group }, index) => {
            const href = communityGroupHref(community.slug, space.slug);
            const latest =
              group.channels[0]?.name
                ? `Latest · ${group.channels[0].name}`
                : `${group.channels.length} channels ready`;
            return (
              <GroupCard
                key={space.id}
                group={group}
                href={href}
                category={group.tags[0]}
                latestUpdate={latest}
                isFavorite={isFavorite("group", space.id)}
                isOwner={Boolean(isOwner)}
                isNew={index === 0 && spacesWithRooms.length <= 3}
                ownerName={null}
                onToggleFavorite={() => {
                  const was = isFavorite("group", space.id);
                  toggleFavorite("group", space.id);
                  toast.success(was ? "Removed from favorites" : "Saved to favorites");
                }}
                onInvite={() => {
                  void navigator.clipboard.writeText(
                    `${window.location.origin}${href}`
                  );
                  toast.success("Invite link copied");
                }}
                onQuickJoin={
                  membership
                    ? undefined
                    : () => router.push(`/communities/${community.slug}/subscribe`)
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
