/**
 * Feed publisher identity.
 * author_id stays the authenticated user. Community publishing is a display
 * attribution on the post's existing community, never a swapped author id.
 */

export type PublishAs = "profile" | "community";

const COMMUNITY_PUBLISHER_ROLES = new Set(["owner", "admin", "moderator"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function canPublishAsCommunity(role: string | null | undefined): boolean {
  return COMMUNITY_PUBLISHER_ROLES.has(String(role || "").toLowerCase());
}

export function readPublishAs(attachments: unknown): PublishAs {
  if (!isRecord(attachments) || !isRecord(attachments.jimvio)) return "profile";
  return attachments.jimvio.published_as === "community" ? "community" : "profile";
}

export function withPublishAs(
  attachments: unknown,
  publishAs: PublishAs,
): Record<string, unknown> {
  const base = isRecord(attachments) ? { ...attachments } : {};
  const jimvio = isRecord(base.jimvio) ? { ...base.jimvio } : {};
  jimvio.published_as = publishAs;
  return { ...base, jimvio };
}

export function assertCommunityPublish(input: {
  publishAs: PublishAs;
  role: string | null;
  requestedAuthorId?: string | null;
  actorId: string;
}): { ok: true } | { ok: false; status: number; error: string } {
  if (input.requestedAuthorId && input.requestedAuthorId !== input.actorId) {
    return { ok: false, status: 403, error: "You can only publish as yourself" };
  }
  if (input.publishAs === "community" && !canPublishAsCommunity(input.role)) {
    return { ok: false, status: 403, error: "You cannot publish as this community" };
  }
  return { ok: true };
}

export function isUsableAvatarUrl(url: string | null | undefined): boolean {
  const value = url?.trim();
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export type FeedPublisher = {
  kind: PublishAs;
  name: string;
  handle: string;
  href: string | null;
  avatar: string | null;
};

export function resolveFeedPublisher(input: {
  attachments: unknown;
  profile: { name: string; username: string | null; avatar: string | null };
  community: { name: string | null; slug: string | null; avatar: string | null } | null;
}): FeedPublisher {
  const profileHref = input.profile.username
    ? `/u/${input.profile.username}`
    : null;
  const asCommunity =
    readPublishAs(input.attachments) === "community" &&
    Boolean(input.community?.slug) &&
    Boolean(input.community?.name);
  if (asCommunity && input.community?.slug && input.community.name) {
    return {
      kind: "community",
      name: input.community.name,
      handle: "Community",
      href: `/communities/${input.community.slug}`,
      avatar: input.community.avatar,
    };
  }
  return {
    kind: "profile",
    name: input.profile.name,
    handle: input.profile.username ? `@${input.profile.username}` : "@member",
    href: profileHref,
    avatar: input.profile.avatar,
  };
}

/** Stable ~50/50 split of existing editorial keys. Does not create posts. */
export function planEditorialPublishAs(
  keys: string[],
): Array<{ key: string; publishAs: PublishAs }> {
  const unique = [...new Set(keys.filter(Boolean))].sort();
  const communityCount = Math.floor(unique.length / 2);
  return unique.map((key, index) => ({
    key,
    publishAs: index < communityCount ? "community" : "profile",
  }));
}
