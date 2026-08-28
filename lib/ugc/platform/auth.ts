import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  evaluateCreatorProfileCompletion,
  isCreatorWorkspaceReady,
  type CreatorProfileCompletion,
} from "@/lib/identity/creator-profile-completion";
import {
  ensureInfluencerMirror,
  loadCreatorProfileCompletion,
  type InfluencerMirrorResult,
} from "@/lib/identity/sync";

export async function requireUser(): Promise<
  | { user: User; db: ReturnType<typeof createServiceRoleClient>; error: null }
  | { user: null; db: null; error: "Unauthorized" }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, db: null, error: "Unauthorized" };
  return { user, db: createServiceRoleClient(), error: null };
}

export async function requireVendor(userId: string) {
  const db = createServiceRoleClient();
  const { data: vendor } = await db
    .from("vendors")
    .select("id, user_id, business_name, business_logo, business_slug")
    .eq("user_id", userId)
    .maybeSingle();
  return { db, vendor };
}

export async function requireInfluencer(userId: string) {
  const db = createServiceRoleClient();
  const completion = await loadCreatorProfileCompletion(userId);
  const select =
    "id, user_id, display_name, profile_image, niche, total_followers, is_verified";

  const { data: existing } = await db
    .from("influencers")
    .select(select)
    .eq("user_id", userId)
    .maybeSingle();

  let mirror: InfluencerMirrorResult = {
    id: existing?.id ?? null,
    created: false,
    reason: completion.complete ? "existing" : "incomplete",
  };

  if (completion.complete) {
    mirror = await ensureInfluencerMirror(userId);
  }

  const { data: influencer } = await db
    .from("influencers")
    .select(select)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    db,
    influencer,
    mirror,
    completion,
    ready: isCreatorWorkspaceReady(completion, influencer),
  };
}

export async function isAdmin(userId: string) {
  const db = createServiceRoleClient();
  const { data } = await db
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("is_active", true)
    .maybeSingle();
  return Boolean(data);
}

export function creatorProfileRequiredPayload(completion: CreatorProfileCompletion) {
  return {
    error: "Complete your creator profile first.",
    needsProfile: true as const,
    complete: false as const,
    missing: completion.missing,
  };
}

export { evaluateCreatorProfileCompletion, isCreatorWorkspaceReady };
export type { CreatorProfileCompletion };
