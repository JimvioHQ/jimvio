import { createClient } from "@/lib/supabase/server";
import { getAdminDB } from "@/services/base";
import { ensureDefaultCommunityWorkspace } from "@/lib/community/ensure-default-workspace";

export function slugifyCommunityName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export type CreateOwnedCommunityInput = {
  name: string;
  slug?: string;
  tagline?: string;
  description?: string;
  long_description?: string;
  avatar_url?: string;
  cover_image?: string;
  category?: string;
  tags?: string[];
  is_private?: boolean;
  is_free?: boolean;
  monthly_price?: number;
  yearly_price?: number;
  lifetime_price?: number;
  currency?: string;
  trial_days?: number;
  platform_commission_rate?: number;
  visibility?: "public" | "private" | "invite_only";
};

export type OwnedCommunityRecord = {
  id: string;
  slug: string;
  name: string;
  [key: string]: unknown;
};

export type CreateOwnedCommunityResult =
  | { ok: true; community: OwnedCommunityRecord }
  | { ok: false; error: string; status: number };

/**
 * Creates a community for the signed-in user and seeds the default workspace.
 * Uses the same authorization path as POST /api/communities.
 */
export async function createOwnedCommunity(
  input: CreateOwnedCommunityInput,
): Promise<CreateOwnedCommunityResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized", status: 401 };

  const name = String(input.name ?? "");
  if (!name.trim()) return { ok: false, error: "name is required", status: 400 };

  const slug = input.slug || slugifyCommunityName(name);
  if (!slug) return { ok: false, error: "Invalid slug", status: 400 };

  const insert: Record<string, unknown> = {
    name,
    slug,
    owner_id: user.id,
    tagline: input.tagline,
    description: input.description,
    long_description: input.long_description,
    avatar_url: input.avatar_url,
    cover_image: input.cover_image,
    category: input.category,
    tags: input.tags,
    is_private: input.is_private,
    is_free: input.is_free,
    monthly_price: input.monthly_price,
    yearly_price: input.yearly_price,
    lifetime_price: input.lifetime_price,
    currency: input.currency || "USD",
    trial_days: input.trial_days,
    platform_commission_rate: input.platform_commission_rate,
  };

  if (
    input.visibility === "public" ||
    input.visibility === "private" ||
    input.visibility === "invite_only"
  ) {
    insert.visibility = input.visibility;
    insert.visibility_mode = input.visibility;
    insert.is_private = input.visibility !== "public";
  }

  const { data, error } = await supabase.from("communities").insert(insert as never).select().single();

  if (error || !data) {
    const duplicate = error?.code === "23505" || /duplicate|unique/i.test(error?.message ?? "");
    if (duplicate) {
      return { ok: false, error: "A community with this name already exists.", status: 409 };
    }
    console.error("[communities] insert failed:", error?.message);
    return { ok: false, error: "Could not create community.", status: 400 };
  }

  const record = data as OwnedCommunityRecord;
  const admin = getAdminDB();
  const { error: membershipError } = await admin.from("community_memberships").insert({
    community_id: record.id,
    user_id: user.id,
    role: "owner",
    plan_type: "lifetime",
    status: "active",
  });
  if (membershipError) {
    console.error("[communities] owner membership insert failed:", membershipError.message);
    await admin.from("communities").delete().eq("id", record.id).eq("owner_id", user.id);
    return {
      ok: false,
      error: "Could not finish community setup. Please try again.",
      status: 500,
    };
  }

  await ensureDefaultCommunityWorkspace(admin as never, record.id, {
    communityName: record.name,
    communitySlug: record.slug,
  });

  return { ok: true, community: record };
}
