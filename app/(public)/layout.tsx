// import { Suspense } from "react";
// import { Navbar } from "@/components/layout/navbar";
// import { Footer } from "@/components/layout/footer";
// import { ProductChatWidgetLoader } from "@/components/marketplace/product-chat-widget-loader";
// import { AISourcingAssistant } from "@/components/marketplace/ai-sourcing-assistant";
// import { createClient, getCachedUser } from "@/lib/supabase/server";
// import { getResolvedPlatformSettings, PLATFORM_SETTINGS_DEFAULTS } from "@/lib/platform-settings";

// export default async function PublicLayout({ children }: { children: React.ReactNode }) {
//   let profile = null;

//   try {
//     const { data: { user } } = await getCachedUser();
//     const supabase = await createClient();

//     if (user) {
//       const { data } = await supabase
//         .from("profiles")
//         .select("email, full_name, avatar_url")
//         .eq("id", user.id)
//         .single();
//       profile = data;
//       if (!profile && user.email) {
//         profile = {
//           email: user.email,
//           full_name: user.user_metadata?.full_name || null,
//           avatar_url: user.user_metadata?.avatar_url || null,
//         };
//       }
//     }
//   } catch {
//     // Silently handle DB not set up yet
//   }

//   const platformSettings = await getResolvedPlatformSettings().catch(() => null);
//   const marketing = platformSettings?.marketing ?? PLATFORM_SETTINGS_DEFAULTS.marketing;

//   return (
//     <div className="flex flex-col min-h-screen" style={{ background: "var(--color-bg)" }}>
//       {/* <Suspense fallback={<div className="min-h-[var(--navbar-height)]" aria-hidden />}>
//         <Navbar user={profile} marketing={marketing} />
//       </Suspense> */}
//       <main className="flex-1 pt-[var(--navbar-height)] pb-0 md:pb-0 relative isolation-auto">
//         {children}
//       </main>
//       <Footer contact={platformSettings?.contact} />
//       <AISourcingAssistant />
//       <ProductChatWidgetLoader />
//     </div>
//   );
// }

// app/(public)/layout.tsx
import { Suspense } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductChatWidgetLoader } from "@/components/marketplace/product-chat-widget-loader";
import { AISourcingAssistant } from "@/components/marketplace/ai-sourcing-assistant";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import {
  getResolvedPlatformSettings,
  PLATFORM_SETTINGS_DEFAULTS,
} from "@/lib/platform-settings";

function NavbarSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="min-h-[var(--navbar-height)] w-full"
      style={{
        background:
          "linear-gradient(90deg, var(--color-bg) 25%, var(--color-surface, hsl(0 0% 96%)) 50%, var(--color-bg) 75%)",
        backgroundSize: "200% 100%",
        animation: "navbar-shimmer 1.4s ease infinite",
      }}
    />
  );
}

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

      profile = data ?? {
        email: user.email,
        full_name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
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

        <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <Footer contact={platformSettings?.contact} />
        </div>

        <AISourcingAssistant />
        <ProductChatWidgetLoader />
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