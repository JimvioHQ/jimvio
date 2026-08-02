"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Star, X } from "lucide-react";
import JimvioLogo from "@/components/ui/logo";
import { getWorkspaceNav, type WorkspaceNavItem } from "@/lib/jimvio-os/workspaces";
import { loadOsRecents } from "@/lib/jimvio-os/recents";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { OsIcon } from "./OsIcon";
import { OsWorkspaceSwitcher } from "./OsWorkspaceSwitcher";
import { cn } from "./os-ui";

const SECTION_ORDER: Array<{ key: NonNullable<WorkspaceNavItem["section"]>; label: string }> = [
  { key: "primary", label: "Navigate" },
  { key: "tools", label: "Tools" },
  { key: "finance", label: "Finance" },
  { key: "system", label: "System" },
];

function groupBySection(items: WorkspaceNavItem[]) {
  const groups: Record<string, WorkspaceNavItem[]> = {};
  for (const item of items) {
    const key = item.section ?? "primary";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

function OsNavLink({
  item,
  active,
  collapsed,
  onAi,
  onNavigate,
  isFavorite,
  onToggleFavorite,
}: {
  item: WorkspaceNavItem;
  active: boolean;
  collapsed: boolean;
  onAi: () => void;
  onNavigate?: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const baseClasses = cn(
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-[background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
    active
      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-semibold"
      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
    collapsed && "justify-center px-2",
  );

  const inner = (
    <>
      <OsIcon name={item.icon} className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </>
  );

  if (item.href === "#open-ai") {
    return (
      <button
        type="button"
        onClick={() => {
          onAi();
          onNavigate?.();
        }}
        title={collapsed ? item.label : undefined}
        className={baseClasses}
      >
        {inner}
      </button>
    );
  }

  return (
    <li className="group relative list-none">
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={cn(baseClasses, !collapsed && "pr-7")}
      >
        {inner}
      </Link>
      {!collapsed && (
        <button
          type="button"
          aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite();
          }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
        >
          <Star
            className={cn(
              "size-3.5",
              isFavorite ? "fill-[var(--color-accent)] text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
            )}
          />
        </button>
      )}
    </li>
  );
}

function SidebarContent({
  collapsed,
  onCollapseToggle,
  onNavigate,
  onMobileClose,
}: {
  collapsed: boolean;
  onCollapseToggle?: () => void;
  onNavigate?: () => void;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname() ?? "/dashboard";
  const workspaceMode = useJimvioOsStore((s) => s.workspaceMode);
  const favorites = useJimvioOsStore((s) => s.favorites);
  const toggleFavorite = useJimvioOsStore((s) => s.toggleFavorite);
  const openAssistant = useAIStore((s) => s.openAssistant);
  const [recents, setRecents] = useState<ReturnType<typeof loadOsRecents>>([]);

  useEffect(() => {
    setRecents(loadOsRecents());
  }, [pathname]);

  const navItems = getWorkspaceNav(workspaceMode);
  const grouped = groupBySection(navItems);
  const favoriteItems = navItems.filter((item) => favorites.includes(item.id));

  function isActive(item: WorkspaceNavItem) {
    if (item.href === "#open-ai") return false;
    if (item.href === "/dashboard") return pathname === "/dashboard";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-3.5", collapsed && "justify-center px-2")}>
        <JimvioLogo
          href="/dashboard"
          size="sm"
          variant={collapsed ? "icon" : "full"}
          className="min-w-0 flex-1"
        />
        {onMobileClose ? (
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close navigation"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
          >
            <X className="size-4" />
          </button>
        ) : (
          onCollapseToggle && (
            <button
              type="button"
              onClick={onCollapseToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
            >
              {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
            </button>
          )
        )}
      </div>

      {!collapsed && (
        <div className="border-b border-[var(--color-border)] px-3 py-3">
          <OsWorkspaceSwitcher />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2.5 py-3">
        {!collapsed && favoriteItems.length > 0 && (
          <section className="mb-4" aria-label="Favorites">
            <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Favorites
            </p>
            <ul className="space-y-0.5">
              {favoriteItems.map((item) => (
                <OsNavLink
                  key={`fav-${item.id}`}
                  item={item}
                  active={isActive(item)}
                  collapsed={collapsed}
                  onAi={openAssistant}
                  onNavigate={onNavigate}
                  isFavorite
                  onToggleFavorite={() => toggleFavorite(item.id)}
                />
              ))}
            </ul>
          </section>
        )}

        {SECTION_ORDER.map(({ key, label }) => {
          const items = grouped[key];
          if (!items || items.length === 0) return null;
          return (
            <section key={key} className="mb-4" aria-label={label}>
              {!collapsed && (
                <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {label}
                </p>
              )}
              <ul className="space-y-0.5" role="list">
                {items.map((item) => (
                  <OsNavLink
                    key={item.id}
                    item={item}
                    active={isActive(item)}
                    collapsed={collapsed}
                    onAi={openAssistant}
                    onNavigate={onNavigate}
                    isFavorite={favorites.includes(item.id)}
                    onToggleFavorite={() => toggleFavorite(item.id)}
                  />
                ))}
              </ul>
            </section>
          );
        })}

        {!collapsed && recents.length > 0 && (
          <section className="mt-1" aria-label="Recent pages">
            <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Recent
            </p>
            <ul className="space-y-0.5">
              {recents.slice(0, 5).map((page) => (
                <li key={page.id}>
                  <Link
                    href={page.href}
                    onClick={onNavigate}
                    className="block truncate rounded-lg px-2.5 py-2 text-[12px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export function OsIntelligentSidebar({
  mobileOpen = false,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const collapsed = useJimvioOsStore((s) => s.frameSidebarCollapsed);
  const toggleCollapsed = useJimvioOsStore((s) => s.toggleFrameSidebarCollapsed);

  return (
    <>
      <aside
        aria-label="Jimvio Creator OS navigation"
        className={cn(
          "hidden h-full shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-[width] duration-200 lg:flex",
          collapsed ? "w-[76px]" : "w-[240px]",
        )}
      >
        <SidebarContent collapsed={collapsed} onCollapseToggle={toggleCollapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={onMobileClose}
          />
          <div
            className="absolute inset-y-0 left-0 w-[min(82vw,272px)] bg-[var(--color-surface)] shadow-2xl"
            style={{ animation: "jimvio-os-enter 220ms ease-out" }}
          >
            <SidebarContent collapsed={false} onNavigate={onMobileClose} onMobileClose={onMobileClose} />
          </div>
        </div>
      )}
    </>
  );
}
