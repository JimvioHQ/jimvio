import "server-only";

import { createClient, getCachedUser } from "@/lib/supabase/server";
import {
  FEED_AUTH_GUEST,
  type FeedAuthInitial,
  toDisplayName,
} from "@/lib/feed/feed-user";

/** Server session snapshot for hub/feed hydration. Identity from getUser() only. */
export async function loadFeedAuthInitial(): Promise<FeedAuthInitial> {
  try {
    const {
      data: { user: authUser },
    } = await getCachedUser();
    if (!authUser) return FEED_AUTH_GUEST;

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, username, avatar_url")
      .eq("id", authUser.id)
      .maybeSingle();

    const fullName = profile?.full_name ?? null;
    const username = profile?.username ?? null;

    return {
      isAuthenticated: true,
      user: {
        id: authUser.id,
        displayName: toDisplayName(fullName, username),
        fullName,
        username,
        avatarUrl: profile?.avatar_url ?? null,
      },
    };
  } catch {
    return FEED_AUTH_GUEST;
  }
}
