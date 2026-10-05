import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommunityWorkspaceFrame } from "@/components/community/CommunityWorkspaceFrame";
import { WorkspaceLayout } from "@/components/community/workspace/WorkspaceShell";
import {
  loadCommunityWorkspace,
  type CommunityWorkspacePayload,
} from "@/lib/community/load-community-workspace";
import {
  buildHubLoginUrl,
  getCommunitySubroute,
  isCommunityWorkspaceSubroute,
} from "@/lib/community/hub-auth";
import { communityIsRestrictedToMembers } from "@/lib/community/join-policy";

function WorkspaceFallback() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">
      Loading community…
    </div>
  );
}

function renderWorkspace(slug: string, payload: CommunityWorkspacePayload, children: React.ReactNode) {
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

  // Manage Community uses OwnerConsoleLayout only — never nest member workspace chrome.
  const isManageRoute =
    getCommunitySubroute(pathname) === "manage" ||
    /\/communities\/[^/]+\/manage(?:\/|$)/.test(pathname);
  if (isManageRoute) {
    return <div className="h-full min-h-0">{children}</div>;
  }

  const needsWorkspace = isCommunityWorkspaceSubroute(pathname);

  const supabase = await createClient();
  const { data: community } = await supabase
    .from("communities")
    .select("id, is_private, visibility, visibility_mode, is_active, archived_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (needsWorkspace) {
      if (communityIsRestrictedToMembers(community)) {
        redirect(buildHubLoginUrl(pathname));
      }
      const payload = await loadCommunityWorkspace(slug, null);
      if (!payload) redirect(buildHubLoginUrl(pathname));
      return renderWorkspace(slug, payload, children);
    }
    return <div className="h-full min-h-0">{children}</div>;
  }

  const payload = await loadCommunityWorkspace(slug, user.id);
  if (!payload) notFound();

  const hasWorkspaceAccess =
    payload.isOwner ||
    (payload.membership?.status === "active" && Boolean(payload.membership.role));

  if (!hasWorkspaceAccess) {
    if (needsWorkspace) {
      if (communityIsRestrictedToMembers(payload.community)) {
        redirect(`/communities/${slug}`);
      }
      return renderWorkspace(slug, payload, children);
    }
    return <div className="h-full min-h-0">{children}</div>;
  }

  return renderWorkspace(slug, payload, children);
}
