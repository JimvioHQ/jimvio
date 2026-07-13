
import { Suspense } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DeferredPublicWidgets } from "@/components/layout/deferred-public-widgets";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import {
  getResolvedPlatformSettings,
  PLATFORM_SETTINGS_DEFAULTS,
} from "@/lib/platform-settings";
import { PublicLayoutShell, NavbarSkeleton } from "@/components/layout/public-layout-shell";

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
    <>
      <div
        className="flex flex-col min-h-screen"
        style={{ background: "var(--color-bg)" }}
      >
        <Suspense fallback={<NavbarSkeleton />}>
          <Navbar user={profile} marketing={marketing} />
        </Suspense>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 pt-[var(--navbar-height)] relative isolation-auto"
          style={{
            animation: "page-enter 220ms ease both",
            overscrollBehaviorY: "contain",
          }}
        >
          {children}
        </main>

        <div style={{ paddingBottom: "env(safe-area-inset-bottom)", background: "var(--color-bg)" }}>
          <Footer contact={platformSettings?.contact} />
        </div>

        <DeferredPublicWidgets />
      </div>

      <style>{`
        @keyframes page-enter {
          from { opacity: 0; translate: 0 6px; }
          to   { opacity: 1; translate: 0 0; }
        }
        @keyframes navbar-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        #main-content { min-height: calc(100dvh - var(--navbar-height)); }
      `}</style>
    </>
  );
}
