"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getWorkspaceDefinition,
  OS_CORE_RAIL,
  OS_PROFILE_RAIL,
  type WorkspaceNavItem,
} from "@/lib/jimvio-os/workspaces";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { OsIcon } from "./OsIcon";
import { cn } from "@/lib/utils";

/**
 * Overlay shell sidebar (⌘.) — mirrors Creator OS IA:
 * Workspace tools → Core → Profile. No Pinned / Recent.
 */
export function OsSidebar() {
  const pathname = usePathname() ?? "/dashboard";
  const collapsed = useJimvioOsStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useJimvioOsStore((s) => s.toggleSidebarCollapsed);
  const workspaceMode = useJimvioOsStore((s) => s.workspaceMode);
  const openAssistant = useAIStore((s) => s.openAssistant);
  const workspace = getWorkspaceDefinition(workspaceMode);
  const width = collapsed ? "w-[72px]" : "w-[248px]";

  function isActive(item: WorkspaceNavItem) {
    if (item.href === "#open-ai") return false;
    if (item.href === "/dashboard") return pathname === "/dashboard";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

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
            <p className="text-[12px] font-bold text-[var(--color-text-primary)]">{workspace.label}</p>
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
        <NavSection
          title={workspace.label}
          items={workspace.tools}
          collapsed={collapsed}
          isActive={isActive}
          onAi={openAssistant}
        />
        {!collapsed && <div className="mx-2 my-3 h-px bg-[var(--color-border)]" aria-hidden />}
        <NavSection
          title="Core"
          items={OS_CORE_RAIL}
          collapsed={collapsed}
          isActive={isActive}
          onAi={openAssistant}
        />
        {!collapsed && <div className="mx-2 my-3 h-px bg-[var(--color-border)]" aria-hidden />}
        <NavSection
          title="Profile"
          items={OS_PROFILE_RAIL}
          collapsed={collapsed}
          isActive={isActive}
          onAi={openAssistant}
        />
      </div>
    </nav>
  );
}

function NavSection({
  title,
  items,
  collapsed,
  isActive,
  onAi,
}: {
  title: string;
  items: WorkspaceNavItem[];
  collapsed: boolean;
  isActive: (item: WorkspaceNavItem) => boolean;
  onAi: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-1" aria-label={title}>
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
          />
        ))}
      </ul>
    </section>
  );
}

function OsNavLink({
  item,
  active,
  collapsed,
  onAi,
}: {
  item: WorkspaceNavItem;
  active: boolean;
  collapsed: boolean;
  onAi: () => void;
}) {
  const base = cn(
    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
    active
      ? "bg-[var(--color-accent)]/10 font-semibold text-[var(--color-accent)]"
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
      <li>
        <button type="button" onClick={onAi} title={collapsed ? item.label : undefined} className={base}>
          {inner}
        </button>
      </li>
    );
  }

  return (
    <li>
      <Link href={item.href} title={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined} className={base}>
        {inner}
      </Link>
    </li>
  );
}
