"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Star, X } from "lucide-react";
import JimvioLogo from "@/components/ui/logo";
import {
  getWorkspaceDefinition,
  OS_GLOBAL_RAIL,
  type WorkspaceNavItem,
} from "@/lib/jimvio-os/workspaces";
import { loadOsRecents } from "@/lib/jimvio-os/recents";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { OsIcon } from "./OsIcon";
import { OsWorkspaceSwitcher } from "./OsWorkspaceSwitcher";
import { cn } from "./os-ui";

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
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const baseClasses = cn(
    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12.5px] font-medium transition-[background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
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
      <li className="list-none">
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
      </li>
    );
  }

  return (
    <li className="group relative list-none">
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={cn(baseClasses, !collapsed && onToggleFavorite && "pr-7")}
      >
        {inner}
      </Link>
      {!collapsed && onToggleFavorite && (
        <button
          type="button"
          aria-label={isFavorite ? "Unpin from sidebar" : "Pin to sidebar"}
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

  const workspace = getWorkspaceDefinition(workspaceMode);
  const tools = workspace.tools;

  // Pool of every pinnable item — used to resolve favorite ids to a label/href/icon.
  const pinnablePool = useMemo(() => {
    const byId = new Map<string, WorkspaceNavItem>();
    for (const item of [...OS_GLOBAL_RAIL, ...tools]) byId.set(item.id, item);
    return byId;
  }, [tools]);

  const pinnedItems = favorites
    .map((id) => pinnablePool.get(id))
    .filter((item): item is WorkspaceNavItem => Boolean(item));

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
            className="grid size-8 shrink-0 place-items-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
          >
            <X className="size-4" />
          </button>
        ) : (
          onCollapseToggle && (
            <button
              type="button"
              onClick={onCollapseToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="grid size-7 shrink-0 place-items-center rounded-xl text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
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
        {!collapsed && pinnedItems.length > 0 && (
          <section className="mb-4" aria-label="Pinned">
            <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Pinned
            </p>
            <ul className="space-y-0.5">
              {pinnedItems.map((item) => (
                <OsNavLink
                  key={`pinned-${item.id}`}
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

        {!collapsed && recents.length > 0 && (
          <section className="mb-4" aria-label="Recent pages">
            <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Recent
            </p>
            <ul className="space-y-0.5">
              {recents.slice(0, 5).map((page) => (
                <li key={page.id} className="list-none">
                  <Link
                    href={page.href}
                    onClick={onNavigate}
                    className="block truncate rounded-xl px-2.5 py-2 text-[12px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!collapsed && (pinnedItems.length > 0 || recents.length > 0) && (
          <div className="mx-2 mb-4 h-px bg-[var(--color-border)]" aria-hidden />
        )}

        <section className="mb-4" aria-label="Jimvio OS">
          <ul className="space-y-0.5" role="list">
            {OS_GLOBAL_RAIL.map((item) => (
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

        {tools.length > 0 && (
          <section className="mb-4" aria-label="Workspace tools">
            {!collapsed && (
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                Workspace tools
              </p>
            )}
            <ul className="space-y-0.5" role="list">
              {tools.map((item) => (
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
          collapsed ? "w-[76px]" : "w-[248px]",
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
