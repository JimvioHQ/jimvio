"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import JimvioLogo from "@/components/ui/logo";
import {
  getWorkspaceDefinition,
  OS_CORE_RAIL,
  OS_PROFILE_RAIL,
  type WorkspaceNavItem,
} from "@/lib/jimvio-os/workspaces";
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
}: {
  item: WorkspaceNavItem;
  active: boolean;
  collapsed: boolean;
  onAi: () => void;
  onNavigate?: () => void;
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
    <li className="list-none">
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={baseClasses}
      >
        {inner}
      </Link>
    </li>
  );
}

function NavSection({
  title,
  items,
  collapsed,
  isActive,
  onAi,
  onNavigate,
}: {
  title: string;
  items: WorkspaceNavItem[];
  collapsed: boolean;
  isActive: (item: WorkspaceNavItem) => boolean;
  onAi: () => void;
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-5" aria-label={title}>
      {!collapsed && (
        <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          {title}
        </p>
      )}
      <ul className="space-y-0.5" role="list">
        {items.map((item) => (
          <OsNavLink
            key={item.id}
            item={item}
            active={isActive(item)}
            collapsed={collapsed}
            onAi={onAi}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </section>
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
  const openAssistant = useAIStore((s) => s.openAssistant);

  const workspace = getWorkspaceDefinition(workspaceMode);

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

      <div className="flex-1 overflow-y-auto px-2.5 py-4">
        <NavSection
          title={workspace.label}
          items={workspace.tools}
          collapsed={collapsed}
          isActive={isActive}
          onAi={openAssistant}
          onNavigate={onNavigate}
        />

        {!collapsed && <div className="mx-2 mb-5 h-px bg-[var(--color-border)]" aria-hidden />}

        <NavSection
          title="Navigate"
          items={OS_CORE_RAIL}
          collapsed={collapsed}
          isActive={isActive}
          onAi={openAssistant}
          onNavigate={onNavigate}
        />

        {!collapsed && <div className="mx-2 mb-5 h-px bg-[var(--color-border)]" aria-hidden />}

        <NavSection
          title="Profile"
          items={OS_PROFILE_RAIL}
          collapsed={collapsed}
          isActive={isActive}
          onAi={openAssistant}
          onNavigate={onNavigate}
        />
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
