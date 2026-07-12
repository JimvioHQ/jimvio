"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { OS_NAV_ITEMS } from "@/lib/jimvio-os";
import { loadOsRecents } from "@/lib/jimvio-os/recents";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { OsIcon } from "./OsIcon";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function OsSidebar() {
  const pathname = usePathname();
  const collapsed = useJimvioOsStore((s) => s.sidebarCollapsed);
  const favorites = useJimvioOsStore((s) => s.favorites);
  const toggleCollapsed = useJimvioOsStore((s) => s.toggleSidebarCollapsed);
  const toggleFavorite = useJimvioOsStore((s) => s.toggleFavorite);
  const openAssistant = useAIStore((s) => s.openAssistant);
  const [recents, setRecents] = useState<ReturnType<typeof loadOsRecents>>([]);

  useEffect(() => {
    setRecents(loadOsRecents());
  }, [pathname]);

  const favoriteItems = OS_NAV_ITEMS.filter((item) => favorites.includes(item.id));
  const width = collapsed ? "w-[72px]" : "w-[260px]";

  return (
    <nav
      aria-label="Jimvio OS navigation"
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-[width] duration-300",
        width,
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-3">
        {!collapsed && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">Jimvio OS</p>
            <p className="text-[12px] font-bold text-[var(--color-text-primary)]">Creator Commerce</p>
          </div>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="grid size-8 place-items-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition-[transform,background-color] hover:scale-[1.04] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
          style={{ willChange: "transform" }}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {!collapsed && favoriteItems.length > 0 && (
          <section className="mb-4" aria-label="Favorites">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Favorites</p>
            <ul className="space-y-0.5">
              {favoriteItems.map((item) => (
                <OsNavLink key={`fav-${item.id}`} item={item} pathname={pathname} collapsed={collapsed} onAi={openAssistant} />
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Main navigation">
          {!collapsed && (
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Navigate</p>
          )}
          <ul className="space-y-0.5" role="list">
            {OS_NAV_ITEMS.map((item) => (
              <li key={item.id} className="group relative">
                <OsNavLink item={item} pathname={pathname} collapsed={collapsed} onAi={openAssistant} />
                {!collapsed && (
                  <button
                    type="button"
                    aria-label={favorites.includes(item.id) ? "Remove favorite" : "Add favorite"}
                    onClick={() => toggleFavorite(item.id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                  >
                    <Star
                      className={cn(
                        "size-3.5",
                        favorites.includes(item.id)
                          ? "fill-[var(--color-accent)] text-[var(--color-accent)]"
                          : "text-[var(--color-text-muted)]",
                      )}
                    />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {!collapsed && recents.length > 0 && (
          <section className="mt-4" aria-label="Recent pages">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Recent</p>
            <ul className="space-y-0.5">
              {recents.slice(0, 5).map((page) => (
                <li key={page.id}>
                  <Link
                    href={page.href}
                    className="block truncate rounded-lg px-2.5 py-2 text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </nav>
  );
}

function OsNavLink({
  item,
  pathname,
  collapsed,
  onAi,
}: {
  item: (typeof OS_NAV_ITEMS)[number];
  pathname: string;
  collapsed: boolean;
  onAi: () => void;
}) {
  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

  if (item.href === "#open-ai") {
    return (
      <button
        type="button"
        onClick={onAi}
        title={collapsed ? item.label : undefined}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-semibold transition-[transform,background-color,color] duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
          active
            ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
          collapsed && "justify-center px-2",
        )}
        style={{ willChange: "transform" }}
      >
        <OsIcon name={item.icon} className="size-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-semibold transition-[transform,background-color,color] duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
        active
          ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
        collapsed && "justify-center px-2",
      )}
      style={{ willChange: "transform" }}
    >
      <OsIcon name={item.icon} className="size-4 shrink-0" />
      {!collapsed && <span className="truncate pr-6">{item.label}</span>}
    </Link>
  );
}
