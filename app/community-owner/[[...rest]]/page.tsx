import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  listManageableCommunities,
  OWNER_CONSOLE_HUB,
  ownerConsoleHref,
} from "@/lib/community/owner-console";

export const dynamic = "force-dynamic";

/**
 * Legacy /community-owner/* → /dashboard/communities/[slug]/…
 * Resolves ?community=<id> to slug when present.
 */
export default async function LegacyCommunityOwnerRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ rest?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { rest } = await params;
  const sp = await searchParams;
  const communityParam = sp.community;
  const communityId =
    typeof communityParam === "string"
      ? communityParam
      : Array.isArray(communityParam)
        ? communityParam[0]
        : null;

  const section = (rest ?? []).join("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = communityId
      ? `/community-owner${section ? `/${section}` : ""}?community=${communityId}`
      : "/community-owner";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const communities = await listManageableCommunities(supabase, user.id);
  if (communities.length === 0) {
    redirect("/communities/create");
  }

  let slug =
    communities.find((c) => c.id === communityId)?.slug ??
    communities.find((c) => c.slug === communityId)?.slug ??
    null;

  if (!slug && communityId) {
    const { data } = await supabase
      .from("communities")
      .select("slug")
      .eq("id", communityId)
      .maybeSingle();
    slug = data?.slug ?? null;
  }

  if (!slug) {
    slug = communities[0]?.slug ?? null;
  }

  if (!slug) {
    redirect(OWNER_CONSOLE_HUB);
  }

  const query: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (k === "community") continue;
    if (typeof v === "string" && v) query[k] = v;
    else if (Array.isArray(v) && v[0]) query[k] = v[0];
  }

  redirect(
    ownerConsoleHref(
      slug,
      section,
      Object.keys(query).length ? query : undefined
    )
  );
}
