import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sectionPath } from "@/lib/community/owner-console";

/** Creator Toolkit quick action — route staff into Owner Console. */
export default async function CommunityToolkitRedirect({
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
    redirect(`/login?next=${encodeURIComponent(`/communities/${slug}/toolkit`)}`);
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id, owner_id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) redirect(`/communities/${slug}`);

  if (community.owner_id === user.id) {
    redirect(sectionPath("/community-owner", community.id));
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
    redirect(sectionPath("/community-owner", community.id));
  }

  redirect(`/communities/${slug}`);
}
