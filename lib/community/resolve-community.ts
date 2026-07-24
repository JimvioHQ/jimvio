/**
 * Resolve a community by UUID or slug (shared by members / inbox APIs).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCommunityUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Look up an active community by id (UUID) or slug.
 */
export async function resolveCommunityBySlugOrId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  slugOrId: string,
  opts?: { selectOwner?: boolean }
): Promise<{ id: string; owner_id?: string } | null> {
  if (!slugOrId || typeof slugOrId !== "string") return null;
  const cols = opts?.selectOwner ? "id, owner_id" : "id";

  if (isCommunityUuid(slugOrId)) {
    const { data } = await client
      .from("communities")
      .select(cols)
      .eq("id", slugOrId)
      .eq("is_active", true)
      .maybeSingle();
    if (data) return data as { id: string; owner_id?: string };
  }

  const { data } = await client
    .from("communities")
    .select(cols)
    .eq("slug", slugOrId)
    .eq("is_active", true)
    .maybeSingle();

  return (data as { id: string; owner_id?: string } | null) ?? null;
}
