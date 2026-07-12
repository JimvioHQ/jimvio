"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { WORKSPACES, type WorkspaceId } from "@/lib/workspace/config";

type WorkspaceSidebarProps = {
  workspace: WorkspaceId;
  activeId: string;
  onNavigate?: () => void;
};

export function WorkspaceSidebar({ workspace, activeId, onNavigate }: WorkspaceSidebarProps) {
  const def = WORKSPACES[workspace];

  return (
    <nav className="flex h-full flex-col p-3">
      <div className="mb-4 px-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
          Workspace
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
          {def.label}
        </p>
      </div>

      <ul className="flex flex-1 flex-col gap-0.5">
        {def.sidebar.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 border-t border-[var(--color-border)] pt-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-accent-subtle)] px-3 py-2.5 text-[12px] font-bold text-[var(--color-accent)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent-subtle)]"
        >
          Mission Control
        </Link>
      </div>
    </nav>
  );
}
