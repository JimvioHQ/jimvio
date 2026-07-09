import { createClient, getCachedUser } from "@/lib/supabase/server";
import {
  getResolvedPlatformSettings,
  PLATFORM_SETTINGS_DEFAULTS,
} from "@/lib/platform-settings";
import { PublicLayoutShell } from "@/components/layout/public-layout-shell";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let profile = null;

  try {
    const {
      data: { user },
    } = await getCachedUser();
    const supabase = await createClient();

    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("email, full_name, avatar_url")
        .eq("id", user.id)
        .single();

      profile = {
        email: data?.email ?? user.email ?? "",
        full_name: data?.full_name ?? user.user_metadata?.full_name ?? null,
        avatar_url: data?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
      };
    }
  } catch {
    // DB not ready yet
  }

  const platformSettings = await getResolvedPlatformSettings().catch(
    () => null
  );
  const marketing =
    platformSettings?.marketing ?? PLATFORM_SETTINGS_DEFAULTS.marketing;

  return (
    <PublicLayoutShell
      profile={profile}
      marketing={marketing}
      contact={platformSettings?.contact}
    >
      {children}
    </PublicLayoutShell>
  );
}
