import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canEnterOwnerConsole,
  listManageableCommunities,
  OWNER_CONSOLE_HUB,
  ownerConsoleHref,
} from "@/lib/community/owner-console";
import { OwnerConsoleClientGate } from "@/components/community/owner-console/OwnerConsoleClientGate";

export const dynamic = "force-dynamic";

export default async function CommunityOwnerConsoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ communitySlug: string }>;
}) {
  const { communitySlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(ownerConsoleHref(communitySlug))}`
    );
  }

  const communities = await listManageableCommunities(supabase, user.id);
  if (communities.length === 0) {
    redirect("/communities/create");
  }

  const anyStaff = communities.some((c) => canEnterOwnerConsole(c.role));
  if (!anyStaff) {
    redirect(`/communities/${communities[0].slug}`);
  }

  const selected =
    communities.find((c) => c.slug === communitySlug) ?? null;
  if (!selected) {
    // Unknown or unauthorized slug — send to hub (or first manageable)
    const fallback = communities.find((c) => canEnterOwnerConsole(c.role));
    if (fallback) redirect(ownerConsoleHref(fallback.slug));
    redirect(OWNER_CONSOLE_HUB);
  }

  if (!canEnterOwnerConsole(selected.role)) {
    redirect(`/communities/${selected.slug}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, username")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-text-muted)]">
          Loading Owner Console…
        </div>
      }
    >
      <OwnerConsoleClientGate
        communities={communities}
        communitySlug={communitySlug}
        userId={user.id}
        userName={
          profile?.full_name ||
          profile?.username ||
          user.email?.split("@")[0] ||
          "Owner"
        }
        userAvatar={profile?.avatar_url ?? null}
        badges={{ reports: 0, joins: 0, live: 0 }}
      >
        {children}
      </OwnerConsoleClientGate>
    </Suspense>
  );
}
