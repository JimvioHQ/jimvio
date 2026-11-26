"use server";

import { createClient } from "@/lib/supabase/server";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";

export type PlatformAdminSession = {
  ok: true;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
};

/**
 * Server-only session probe for the admin chrome.
 * Does not return ADMIN_EMAILS or role rows to the client.
 */
export async function getPlatformAdminSession(): Promise<
  PlatformAdminSession | { ok: false; error: string; status: 401 | 403 }
> {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) {
    return { ok: false, error: auth.error, status: auth.status };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", auth.user.id)
    .maybeSingle();

  return {
    ok: true,
    user: {
      id: auth.user.id,
      email: auth.user.email ?? "",
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    },
  };
}
