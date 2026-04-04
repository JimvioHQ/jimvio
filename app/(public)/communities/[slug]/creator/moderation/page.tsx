import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreatorModerationClient } from "@/components/community/creator/CreatorModerationClient";

export const dynamic = "force-dynamic";

export default async function CreatorModerationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Get community
  const { data: community, error: communityErr } = await supabase
    .from("communities")
    .select("id, name, slug, owner_id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (communityErr || !community) notFound();

  // Check if user is owner
  if (community.owner_id !== user.id) {
    throw new Error("Forbidden: Only community owner can access moderation");
  }

  // Get all members with their status
  const { data: memberships, error: membershipsErr } = await supabase
    .from("community_memberships")
    .select(
      `
      id,
      user_id,
      role,
      status,
      profiles!community_memberships_user_id_fkey(full_name, avatar_url, username)
    `
    )
    .eq("community_id", community.id)
    .order("created_at", { ascending: false });

  if (membershipsErr) {
    console.error("Error fetching memberships:", membershipsErr);
    notFound();
  }

  const members = (memberships ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role ?? "member",
    status: m.status ?? "active",
    profile: m.profiles as any,
  }));

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-zinc-900 mb-2">
          Moderation & Safety
        </h1>
        <p className="text-zinc-500">
          Manage your community members and maintain a safe, healthy environment.
        </p>
      </div>

      <CreatorModerationClient
        communityId={community.id}
        members={members}
      />
    </div>
  );
}
