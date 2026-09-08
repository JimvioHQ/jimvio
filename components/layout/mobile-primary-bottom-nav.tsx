"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MOBILE_BOTTOM_NAV_ITEMS,
  resolvePrimaryNavHref,
} from "@/lib/navigation/primary-nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return pathname === "/" || pathname === "";
  if (h === "/communities") {
    return pathname === "/communities" || pathname.startsWith("/communities/");
  }
  return pathname === h || pathname.startsWith(`${h}/`);
}

type MobilePrimaryBottomNavProps = {
  /** When false, still render chrome for guests (hrefs unchanged). */
  isAuthenticated?: boolean;
  className?: string;
};

/**
 * Layout-stable primary mobile bottom nav.
 * Renders immediately — no portal, auth, or data gating.
 */
export function MobilePrimaryBottomNav({
  isAuthenticated = false,
  className,
}: MobilePrimaryBottomNavProps) {
  const pathname = usePathname() ?? "/";

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-[100] md:hidden pb-[env(safe-area-inset-bottom,0px)]",
        className,
      )}
    >
      <nav
        aria-label="Primary mobile navigation"
        className="pointer-events-auto relative grid h-[60px] grid-cols-5 items-stretch border-t border-stone-100 bg-white/95 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] backdrop-blur-md dark:border-white/5 dark:bg-stone-950/95"
      >
        {MOBILE_BOTTOM_NAV_ITEMS.map((link) => {
          const href = resolvePrimaryNavHref(link, isAuthenticated);
          const active = isActive(pathname, href);
          return (
            <Link
              key={`${link.label}-${href}`}
              href={href}
              prefetch
              aria-label={link.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-0.5 transition-colors duration-150",
                active
                  ? "text-orange-600 dark:text-orange-500"
                  : "text-stone-400 dark:text-stone-600",
              )}
            >
              <div className="relative flex h-6 items-center justify-center">
                <link.icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-150",
                    active && "scale-105",
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                {active ? (
                  <span
                    className="absolute inset-0 rounded-full bg-orange-500/20 blur-xl"
                    aria-hidden
                  />
                ) : null}
              </div>
              <span
                className={cn(
                  "max-w-full truncate text-[9px] font-semibold leading-none tracking-tight whitespace-nowrap",
                  active
                    ? "text-orange-600 opacity-100 dark:text-orange-500"
                    : "opacity-70",
                )}
              >
                {link.label}
              </span>
              {active ? (
                <span
                  className="absolute top-0 h-[2px] w-7 rounded-b-full bg-orange-500"
                  aria-hidden
                />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Content padding so fixed bottom nav does not cover page content. */
export const MOBILE_PRIMARY_BOTTOM_NAV_PAD =
  "pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0";
