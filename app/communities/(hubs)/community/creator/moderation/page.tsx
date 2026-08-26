import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildHubLoginUrl } from "@/lib/community/hub-auth";
import { OWNER_CONSOLE_HUB, ownerConsoleHref } from "@/lib/community/owner-console";

export const dynamic = "force-dynamic";

/** Legacy URL without a community slug — send owners to the console. */
export default async function CreatorModerationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(buildHubLoginUrl("/communities/community/creator/moderation"));
  }

  const { data: owned } = await supabase
    .from("communities")
    .select("slug")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (owned?.slug) {
    redirect(ownerConsoleHref(owned.slug, "moderation"));
  }
  redirect(OWNER_CONSOLE_HUB);
}
