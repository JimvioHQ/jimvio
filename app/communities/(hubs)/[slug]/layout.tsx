import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommunityWorkspaceFrame } from "@/components/community/CommunityWorkspaceFrame";
import { WorkspaceLayout } from "@/components/community/workspace/WorkspaceShell";
import { loadCommunityWorkspace } from "@/lib/community/load-community-workspace";
import {
  buildHubLoginUrl,
  isCommunityWorkspaceSubroute,
} from "@/lib/community/hub-auth";

function WorkspaceFallback() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">
      Loading community…
    </div>
  );
}

export default async function CommunitySlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const headerList = await headers();
  const pathname =
    headerList.get("x-jimvio-pathname") ??
    headerList.get("next-url") ??
    `/communities/${slug}`;
  const needsWorkspace = isCommunityWorkspaceSubroute(pathname);

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
    if (needsWorkspace) {
      redirect(buildHubLoginUrl(pathname));
    }
    return <div className="h-full min-h-0">{children}</div>;
  }

  const payload = await loadCommunityWorkspace(slug);
  if (!payload) notFound();

  const hasWorkspaceAccess =
    payload.isOwner ||
    (payload.membership?.status === "active" && Boolean(payload.membership.role));

  if (!hasWorkspaceAccess) {
    // Workspace pages require active membership — send visitors to the public hub.
    if (needsWorkspace) {
      redirect(`/communities/${slug}`);
    }
    return <div className="h-full min-h-0">{children}</div>;
  }

  return (
    <Suspense fallback={<WorkspaceFallback />}>
      <WorkspaceLayout
        community={payload.community as any}
        currentUserId={payload.currentUserId}
        role={(payload.membership?.role ?? (payload.isOwner ? "owner" : "member")) as any}
        isAdmin={payload.isAdmin}
        isOwner={payload.isOwner}
        initialView="member"
        profile={payload.profile}
        points={payload.points}
        spacesWithRooms={payload.spacesWithRooms}
        membership={
          (payload.membership ??
            (payload.isOwner
              ? {
                  role: "owner",
                  status: "active",
                  plan_type: null,
                  space_access: null,
                }
              : null)) as any
        }
        overview={payload.overview}
        ownerName={payload.ownerName}
        joinedAt={payload.joinedAt}
        basePath={`/communities/${slug}`}
        hideSidebar
      >
        <CommunityWorkspaceFrame>{children}</CommunityWorkspaceFrame>
      </WorkspaceLayout>
    </Suspense>
  );
}
