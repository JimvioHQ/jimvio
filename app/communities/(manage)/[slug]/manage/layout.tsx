import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canEnterOwnerConsole,
  listManageableCommunities,
  manageCommunityHref,
} from "@/lib/community/owner-console";
import { OwnerConsoleClientGate } from "@/components/community/owner-console/OwnerConsoleClientGate";

export const dynamic = "force-dynamic";

export default async function ManageCommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(manageCommunityHref(slug))}`);
  }

  const communities = await listManageableCommunities(supabase, user.id);
  if (communities.length === 0) {
    redirect("/communities/create");
  }

  const selected = communities.find((c) => c.slug === slug) ?? null;
  if (!selected || !canEnterOwnerConsole(selected.role)) {
    redirect(`/communities/${slug}`);
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
          Loading Manage Community…
        </div>
      }
    >
      <OwnerConsoleClientGate
        communities={communities}
        communitySlug={slug}
        userId={user.id}
        userName={
          profile?.full_name ||
          profile?.username ||
          user.email?.split("@")[0] ||
          "Owner"
        }
        userAvatar={profile?.avatar_url ?? null}
        badges={{ reports: 0, joins: 0, live: 0 }}
        consoleMode="manage"
      >
        {children}
      </OwnerConsoleClientGate>
    </Suspense>
  );
}
