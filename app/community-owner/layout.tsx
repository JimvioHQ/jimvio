import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canEnterOwnerConsole,
  listManageableCommunities,
} from "@/lib/community/owner-console";
import { OwnerConsoleClientGate } from "@/components/community/owner-console/OwnerConsoleClientGate";

export const dynamic = "force-dynamic";

export default async function CommunityOwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/community-owner")}`);
  }

  const communities = await listManageableCommunities(supabase, user.id);
  if (communities.length === 0) {
    redirect("/communities/create");
  }

  // At least one manageable community — role checked per selection in client gate
  const anyStaff = communities.some((c) => canEnterOwnerConsole(c.role));
  if (!anyStaff) {
    redirect(`/communities/${communities[0].slug}`);
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
