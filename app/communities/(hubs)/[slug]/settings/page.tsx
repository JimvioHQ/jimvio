import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { manageCommunityHref } from "@/lib/community/owner-console";
import {
  hasCapability,
  resolveWorkspaceRole,
} from "@/lib/community/workspace/permissions";

/**
 * Workspace settings gear historically pointed at /[slug]/settings.
 * Staff with settings capability land in Owner Console settings;
 * other staff (e.g. moderators) land in moderation; members go to hub settings.
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

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("role, status, plan_type, space_access")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const role = resolveWorkspaceRole({
    userId: user.id,
    ownerId: community.owner_id,
    membership: isOwner
      ? {
          role: "owner",
          status: "active",
          plan_type: membership?.plan_type ?? null,
          space_access: membership?.space_access ?? null,
        }
      : membership?.status
        ? {
            role: membership.role ?? undefined,
            status: membership.status,
            plan_type: membership.plan_type ?? null,
            space_access: membership.space_access ?? null,
          }
        : null,
  });

  if (hasCapability(role, "settings.view") || hasCapability(role, "settings.manage")) {
    redirect(manageCommunityHref(slug, "settings"));
  }

  if (
    membership?.status === "active" &&
    (hasCapability(role, "moderation.view") ||
      hasCapability(role, "moderation.manage"))
  ) {
    redirect(manageCommunityHref(slug, "moderation"));
  }

  redirect("/communities/settings");
}
