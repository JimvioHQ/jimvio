
// "use client";

// import { useSearchParams } from "next/navigation";
// import { WorkspaceHome } from "@/components/community/workspace-home";
// import { WorkspaceRoomView } from "@/components/community/workspace-room-view";

// export default function CommunityWorkspaceHomePage() {
//   const sp = useSearchParams();
//   const hasRoom = !!sp.get("room");
//   return hasRoom ? <WorkspaceRoomView /> : <WorkspaceHome />;
// }

// app/communities/[slug]/workspace/page.tsx

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/components/community/workspace/WorkspaceShell";
// import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default async function CommunityWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ section?: string; view?: string }>;
}) {
  const { slug } = await params;
  const { section = "feed", view = "member" } = await searchParams;

  const supabase = await createClient();

  // ─ Fetch community ─
  const { data: community } = await supabase
    .from("communities")
    .select("id, slug, name, avatar_url, cover_image, member_count, owner_id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) notFound();

  // ─ Auth + membership ─
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/signin?redirect=/communities/${slug}/workspace`);
  }

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("role, status")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.status !== "active") {
    redirect(`/communities/${slug}`);
  }

  const isOwner = community.owner_id === user.id;
  const isAdmin = isOwner || membership.role === "admin" || membership.role === "moderator";

  return (
    <WorkspaceShell
      community={community}
      currentUserId={user.id}
      role={membership.role}
      isAdmin={isAdmin}
      isOwner={isOwner}
      initialSection={section}
      initialView={view === "admin" && isAdmin ? "admin" : "member"}
    />
  );
}