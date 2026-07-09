import { cache } from "react";
import { createClient, getCachedUser } from "@/lib/supabase/server";

export const getCachedProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  return data;
});

export async function getUGCWorkspaceUser() {
  try {
    const {
      data: { user: authUser },
    } = await getCachedUser();
    if (!authUser) return undefined;

    const profile = await getCachedProfile(authUser.id);
    return {
      name:
        profile?.full_name ??
        authUser.user_metadata?.full_name ??
        authUser.email?.split("@")[0] ??
        "Creator",
      avatarUrl: profile?.avatar_url ?? authUser.user_metadata?.avatar_url ?? null,
    };
  } catch {
    return undefined;
  }
}
