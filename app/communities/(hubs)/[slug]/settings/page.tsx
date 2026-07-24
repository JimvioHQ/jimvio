import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sectionPath } from "@/lib/community/owner-console";

/**
 * Workspace settings gear historically pointed at /[slug]/settings.
 * Staff land in Owner Console; members go to hub settings.
 */
export default async function CommunitySettingsRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/communities/${slug}/settings`)}`);
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id, owner_id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) redirect("/communities/settings");

  const isOwner = community.owner_id === user.id;
  if (isOwner) {
    redirect(sectionPath("settings", slug));
  }

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("role, status")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const staff =
    membership?.status === "active" &&
    (membership.role === "admin" || membership.role === "moderator" || membership.role === "owner");

  if (staff) {
    redirect(sectionPath("settings", slug));
  }

  redirect("/communities/settings");
}
