import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { UGCWorkspaceLayoutClient } from "@/components/ugc/workspace/UGCWorkspaceLayoutClient";
import { ProductChatWidgetLoader } from "@/components/marketplace/product-chat-widget-loader";

export const metadata: Metadata = pageMetadata("ugc");

export default async function UGCLayout({ children }: { children: React.ReactNode }) {
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
          "Creator",
        avatarUrl: profile?.avatar_url ?? authUser.user_metadata?.avatar_url ?? null,
      };
    }
  } catch {
    // optional profile
  }

  return (
    <>
      <UGCWorkspaceLayoutClient user={user}>{children}</UGCWorkspaceLayoutClient>
      <ProductChatWidgetLoader />
    </>
  );
}
