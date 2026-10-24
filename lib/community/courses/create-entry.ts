import { manageCommunityHref } from "@/lib/community/owner-console/nav";
import { hasCapability } from "@/lib/community/workspace/permissions";
import type { WorkspaceRole } from "@/lib/community/workspace/types";

/**
 * Existing course studio lives in Community Manager.
 * One manageable community opens that studio. Several communities use the manager list.
 * Viewers without knowledge.manage get no creation entry.
 */
export function courseCreationHref(
  communities: ReadonlyArray<{ slug: string; role: WorkspaceRole }>
): string | null {
  const allowed = communities.filter((community) =>
    Boolean(community.slug) && hasCapability(community.role, "knowledge.manage")
  );
  if (allowed.length === 0) return null;
  if (allowed.length === 1) return manageCommunityHref(allowed[0]!.slug, "courses");
  return "/owner/communities";
}
