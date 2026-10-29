import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { toSocialAccount } from "@/lib/identity/resolve";
import type { IdentitySocialPlatform, SocialAccount } from "@/lib/identity/types";
import { SocialConnectFlow } from "@/components/identity/SocialConnectFlow";

export const metadata = { title: "Verify social account" };
export const dynamic = "force-dynamic";

const PLATFORMS: IdentitySocialPlatform[] = [
  "tiktok",
  "instagram",
  "youtube",
  "facebook",
  "x",
  "threads",
  "linkedin",
  "pinterest",
  "snapchat",
];

export default async function SocialConnectPage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (!PLATFORMS.includes(platform as IdentitySocialPlatform)) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/settings/profile/social/${platform}`)}`);
  const db = createServiceRoleClient() as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data } = await db
    .from("jip_social_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("platform", platform)
    .maybeSingle();
  return (
    <SocialConnectFlow
      platform={platform as IdentitySocialPlatform}
      initial={data ? toSocialAccount(data as SocialAccount) : null}
      initialCode={(data as { verify_code?: string | null } | null)?.verify_code ?? null}
    />
  );
}
