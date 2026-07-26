import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

/**
 * Community Challenges nav targets /[slug]/missions.
 * Prefer the community's tasks room so completion works in context.
 */
export default async function CommunityMissionsRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: community } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) notFound();

  const { data: tasksRoom } = await supabase
    .from("rooms")
    .select("slug")
    .eq("community_id", community.id)
    .eq("is_active", true)
    .eq("room_type", "tasks")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (tasksRoom?.slug) {
    redirect(`/communities/${encodeURIComponent(slug)}/spaces/${encodeURIComponent(tasksRoom.slug)}`);
  }

  redirect(`/communities/${encodeURIComponent(slug)}/feed`);
}
