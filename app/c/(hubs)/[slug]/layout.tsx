import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceLayout } from "@/components/community/workspace/WorkspaceShell";
import { loadCommunityWorkspace } from "@/lib/community/load-community-workspace";

export default async function CommunitySlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="h-full min-h-0">{children}</div>;
  }

  const payload = await loadCommunityWorkspace(slug);
  if (!payload) notFound();

  if (!payload.membership || payload.membership.status !== "active") {
    return <div className="h-full min-h-0">{children}</div>;
  }

  return (
    <WorkspaceLayout
      community={payload.community as any}
      currentUserId={payload.currentUserId}
      role={payload.membership.role as any}
      isAdmin={payload.isAdmin}
      isOwner={payload.isOwner}
      initialView="member"
      profile={payload.profile}
      points={payload.points}
      spacesWithRooms={payload.spacesWithRooms}
      membership={payload.membership as any}
      overview={payload.overview}
      basePath={`/c/${slug}`}
      hideSidebar
    >
      {children}
    </WorkspaceLayout>
  );
}
