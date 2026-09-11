"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DeferredPublicWidgets } from "@/components/layout/deferred-public-widgets";
import { isWorkspacePublicRoute } from "@/lib/workspace/config";
import { MOBILE_PRIMARY_BOTTOM_NAV_PAD } from "@/components/layout/mobile-primary-bottom-nav";

type MarketingProfile = {
  email: string;
  full_name: string | null;
  avatar_url: string | null;
} | null;

type PublicLayoutShellProps = {
  children: React.ReactNode;
  profile: MarketingProfile;
  marketing: Parameters<typeof Navbar>[0]["marketing"];
  contact: Parameters<typeof Footer>[0]["contact"];
  /** Merchant store host or /s/[handle] — no global Jimvio platform chrome. */
  merchantStorefront?: boolean;
};

function NavbarSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="min-h-[var(--navbar-height)] max-w-[1500px] mx-auto w-full"
      style={{
        background:
          "linear-gradient(90deg, var(--color-bg) 25%, var(--color-surface, hsl(0 0% 96%)) 50%, var(--color-bg) 75%)",
        backgroundSize: "200% 100%",
        animation: "navbar-shimmer 1.4s ease infinite",
      }}
    />
  );
}

export function PublicLayoutShell({
  children,
  profile,
  marketing,
  contact,
  merchantStorefront = false,
}: PublicLayoutShellProps) {
  const pathname = usePathname();
  const isWorkspace = isWorkspacePublicRoute(pathname);
  const isStorefrontPath =
    pathname === "/s" || pathname.startsWith("/s/");
  // `translate` on #main-content (even 0 0 via animation fill-mode) creates a
  // containing block that disables position:sticky for Marketplace's sidebar.
  const isMarketplaceRoute =
    pathname === "/marketplace" || pathname.startsWith("/marketplace/");
  // Home: opacity-only enter — avoid translate + overscroll contain fighting native scroll on mobile.
  const isHomeRoute = pathname === "/";
  const pageEnterAnimation =
    isMarketplaceRoute || isHomeRoute
      ? "page-enter-fade 220ms ease both"
      : "page-enter 220ms ease both";

  // Merchant storefronts get their own header/footer — never the global Jimvio shell.
  if (isWorkspace || merchantStorefront || isStorefrontPath) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex min-h-screen flex-col" style={{ background: "var(--color-bg)" }}>
        <Suspense fallback={<NavbarSkeleton />}>
          <Navbar user={profile} marketing={marketing} />
        </Suspense>

        <main
          id="main-content"
          tabIndex={-1}
          className={`relative isolation-auto flex-1 pt-[var(--navbar-height)] ${MOBILE_PRIMARY_BOTTOM_NAV_PAD}`}
          style={{
            animation: pageEnterAnimation,
            // Do not trap document scroll on Home; nested rails already use overscroll-x-contain.
            ...(isHomeRoute ? null : { overscrollBehaviorY: "contain" as const }),
          }}
        >
          {children}
        </main>

        <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <Footer contact={contact} />
        </div>

        <DeferredPublicWidgets />
      </div>

      <style>{`
        @keyframes page-enter {
          from { opacity: 0; translate: 0 6px; }
          to   { opacity: 1; translate: 0 0; }
        }
        @keyframes page-enter-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
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
