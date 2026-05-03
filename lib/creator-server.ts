import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCommunityForOwner(
  supabase: SupabaseClient,
  userId: string,
  communityId: string
) {
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("id", communityId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function requireCommunityOwner(
  supabase: SupabaseClient,
  userId: string,
  communityId: string
) {
  const row = await getCommunityForOwner(supabase, userId, communityId);
  if (!row) notFound();
  return row;
}

export async function countOwnedCommunities(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from("communities")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);

  if (error) return 0;
  return count ?? 0;
}
