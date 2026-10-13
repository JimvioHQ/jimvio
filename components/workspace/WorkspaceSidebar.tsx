"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKSPACES, type WorkspaceId } from "@/lib/workspace/config";

type WorkspaceSidebarProps = {
  workspace: WorkspaceId;
  activeId: string;
  onNavigate?: () => void;
};

export function WorkspaceSidebar({ workspace, activeId, onNavigate }: WorkspaceSidebarProps) {
  const def = WORKSPACES[workspace];
  const sections = def.sidebarSections;
  const isAffiliate = workspace === "affiliates";

  return (
    <nav className="flex h-full flex-col">
      {!isAffiliate && (
        <div className="mb-2 px-5 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
            Workspace
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
            {def.label}
          </p>
        </div>
      )}

      <div
        className={cn(
          "flex-1 overflow-y-auto px-3",
          isAffiliate ? "pb-2 pt-4" : "p-3 pt-1"
        )}
      >
        {sections ? (
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.id}>
                <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
                  {section.label}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = item.id === activeId;
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-2.5 rounded-[10px] px-2.5 py-[8px] text-[12.5px] font-medium transition-colors",
                            active
                              ? "bg-[#FFF0E8] font-semibold text-[#fd5000]"
                              : "text-[#4B5563] hover:bg-[#F8FAFC] hover:text-[#111827]"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-[15px] w-[15px] shrink-0",
                              active ? "text-[#fd5000]" : "text-[#9CA3AF]"
                            )}
                            strokeWidth={active ? 2.2 : 1.75}
                          />
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
              </div>
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
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
        )}
      </div>

      {def.proCard ? (
        <div className="shrink-0 px-3 pb-3 pt-1">
          <div
            className="relative overflow-hidden rounded-[14px] border border-[#FFE4D6] px-3.5 py-3.5"
            style={{
              background:
                "linear-gradient(160deg, #FFF5F0 0%, #FFFFFF 55%, #FFF8F5 100%)",
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#fd5000] text-[11px] font-black text-white shadow-[0_4px_10px_rgba(253,80,0,0.28)]">
                J
              </span>
              <span className="text-[13px] font-bold tracking-tight text-[#111827]">
                {def.proCard.title}
              </span>
            </div>
            <p className="text-[11px] leading-snug text-[#6B7280]">
              {def.proCard.description}
            </p>
            <Link
              href={def.proCard.href}
              onClick={onNavigate}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#fd5000] px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(253,80,0,0.25)] transition-colors hover:bg-[#e04700]"
            >
              {def.proCard.cta}
              <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      ) : isAffiliate ? null : (
        <div className="mt-auto shrink-0 border-t border-[var(--color-border)] p-3">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-accent-subtle)] px-3 py-2.5 text-[12px] font-bold text-[var(--color-accent)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent-subtle)]"
          >
            Mission Control
          </Link>
        </div>
      )}
    </nav>
  );
}
