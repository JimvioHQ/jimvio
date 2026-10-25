import { resolveCommunityMemberCount } from "@/lib/community/member-count";

const PUBLIC_FIELDS = [
  "id",
  "name",
  "slug",
  "tagline",
  "description",
  "long_description",
  "category",
  "tags",
  "member_count",
  "post_count",
  "is_free",
  "is_featured",
  "monthly_price",
  "yearly_price",
  "lifetime_price",
  "currency",
  "cover_image",
  "image_url",
  "avatar_url",
  "banner_url",
  "created_at",
  "updated_at",
  "is_private",
  "visibility",
  "visibility_mode",
  "is_active",
  "archived_at",
  "language",
  "region",
  "space_count",
  "trial_days",
  "accent_color",
] as const;

type PublicProfile = {
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
};

function publicProfile(value: unknown): PublicProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return {
    full_name: typeof row.full_name === "string" ? row.full_name : null,
    avatar_url: typeof row.avatar_url === "string" ? row.avatar_url : null,
    username: typeof row.username === "string" ? row.username : null,
  };
}

/**
 * Fields the public community directory and cards render.
 * Owner ids, archive actors, and settings stay on the server.
 */
export function toPublicCommunityListItem(
  row: Record<string, unknown>,
  access: { isMember: boolean; isOwner: boolean },
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const field of PUBLIC_FIELDS) {
    if (field in row) next[field] = row[field];
  }
  next.member_count = resolveCommunityMemberCount({
    slug: typeof row.slug === "string" ? row.slug : null,
    member_count: typeof row.member_count === "number" ? row.member_count : Number(row.member_count ?? 0),
  });
  next.profiles = publicProfile(row.profiles);
  next.is_member = access.isMember;
  next.is_owner = access.isOwner;
  return next;
}
