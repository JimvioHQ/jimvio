import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * `/identity` is a router, not a page — it sends signed-in members to
 * their public profile (or the composer if they haven't set a username
 * yet) and everyone else to login.
 */
export default async function IdentityRootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/identity")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.username) {
    redirect(`/u/${profile.username}`);
  }

  redirect("/settings/profile");
}
