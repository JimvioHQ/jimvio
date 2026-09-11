import { headers } from "next/headers";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import {
  getResolvedPlatformSettings,
  PLATFORM_SETTINGS_DEFAULTS,
} from "@/lib/platform-settings";
import { PublicLayoutShell } from "@/components/layout/public-layout-shell";
import { isMerchantStorefrontRequest } from "@/lib/commerce-os/domains/host";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const hostname =
    headerStore.get("x-forwarded-host") || headerStore.get("host") || "";
  const pathname = headerStore.get("x-pathname") || headerStore.get("x-invoke-path") || "";
  const merchantStorefront = isMerchantStorefrontRequest(
    hostname,
    pathname,
    headerStore.get("x-jimvio-store-handle"),
    headerStore.get("x-jimvio-storefront-path")
  );

  let profile = null;

  // Skip platform profile fetch on merchant storefronts — not used without Navbar.
  if (!merchantStorefront) {
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
  }

  const platformSettings = merchantStorefront
    ? null
    : await getResolvedPlatformSettings().catch(() => null);
  const marketing =
    platformSettings?.marketing ?? PLATFORM_SETTINGS_DEFAULTS.marketing;

  // Merchant hosts must not mount PublicLayoutShell at all — otherwise
  // Navbar marketing/nav payloads still serialize into the RSC stream.
  if (merchantStorefront) {
    return <>{children}</>;
  }

  return (
    <PublicLayoutShell
      profile={profile}
      marketing={marketing}
      contact={platformSettings?.contact}
      merchantStorefront={false}
    >
      {children}
    </PublicLayoutShell>
  );
}
