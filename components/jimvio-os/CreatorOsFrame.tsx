"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Home, Plus, ShoppingBag, Users } from "lucide-react";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { OsIntelligentSidebar } from "./OsIntelligentSidebar";
import { OsTopbar, type OsTopbarUser } from "./OsTopbar";
import { OsStatusBar } from "./OsStatusBar";
import { OsAiDock } from "./OsAiDock";
import { cn } from "./os-ui";

type CreatorOsFrameProps = {
  children: React.ReactNode;
  user?: OsTopbarUser;
  unreadNotifications?: number;
  unreadMessages?: number;
};

/** Discovery essentials — Wallet/Orders/Messages via profile & sidebar. */
const MOBILE_NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/marketplace", label: "Market", icon: ShoppingBag },
  { href: "/communities", label: "Communities", icon: Users },
  { href: "/ugc", label: "UGC", icon: Clapperboard },
] as const;

function CreatorOsMobileNav() {
  const pathname = usePathname() ?? "/";
  const openQuickCreate = useJimvioOsStore((s) => s.openQuickCreate);

  return (
    <nav
      aria-label="Creator OS mobile navigation"
      className="flex h-16 shrink-0 items-stretch border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {MOBILE_NAV_ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
              active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
            )}
          >
            <Icon className="size-[19px]" />
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={openQuickCreate}
        className="flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-[var(--color-text-muted)] transition-colors active:text-[var(--color-accent)]"
      >
        <span className="grid size-6 place-items-center rounded-full bg-[var(--color-accent)] text-white">
          <Plus className="size-3.5" />
        </span>
        Create
      </button>
    </nav>
  );
}

/** Persistent Creator Commerce OS frame — sidebar + topbar + mobile nav wrapping all dashboard chrome. */
export function CreatorOsFrame({ children, user, unreadNotifications, unreadMessages }: CreatorOsFrameProps) {
  const hydrate = useJimvioOsStore((s) => s.hydrate);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-bg)]">
      <OsIntelligentSidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <OsTopbar
          user={user}
          unreadNotifications={unreadNotifications}
          unreadMessages={unreadMessages}
          onMobileMenuOpen={() => setMobileNavOpen(true)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
        <OsStatusBar notificationsCount={unreadNotifications} />
        <CreatorOsMobileNav />
      </div>
      <OsAiDock />
    </div>
  );
}
