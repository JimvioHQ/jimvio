import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { WorkspaceLayoutClient } from "@/components/workspace/WorkspaceLayoutClient";

export const metadata: Metadata = pageMetadata("communities");

export default async function CommunitiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user:
    | { name: string; avatarUrl?: string | null; isPremium?: boolean }
    | undefined;

  try {
    const {
      data: { user: authUser },
    } = await getCachedUser();
    if (authUser) {
      const supabase = await createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", authUser.id)
        .maybeSingle();
      user = {
        name:
          profile?.full_name ??
          authUser.user_metadata?.full_name ??
          authUser.email?.split("@")[0] ??
          "Member",
        avatarUrl: profile?.avatar_url ?? authUser.user_metadata?.avatar_url ?? null,
      };
    }
  } catch {
    // optional profile
  }

  return (
    <WorkspaceLayoutClient workspace="communities" user={user} showRightPanel={false}>
      <div className="p-4 sm:p-6 lg:p-8">{children}</div>
    </WorkspaceLayoutClient>
  );
}
