"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Headphones } from "lucide-react";
import { ABOUT_NAV, type AboutSectionId } from "@/lib/about/content";
import { cn } from "@/lib/utils";

type Props = {
  activeId: AboutSectionId;
  onNavigate?: () => void;
  className?: string;
};

export function AboutSidebar({ activeId, onNavigate, className }: Props) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ABOUT_NAV.map((group) => [group.id, Boolean(group.defaultOpen)])),
  );

  return (
    <nav
      aria-label="About Jimvio"
      className={cn(
        "flex h-full min-h-0 flex-col rounded-[16px] border border-[var(--color-border)] bg-white dark:bg-[var(--color-surface)]",
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {ABOUT_NAV.map((group) => {
          const open = openGroups[group.id] ?? false;
          return (
            <div key={group.id} className="mb-1">
              <button
                type="button"
                onClick={() =>
                  setOpenGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                }
                aria-expanded={open}
                className="flex w-full items-center justify-between rounded-[10px] px-2 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
              >
                {group.label}
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                  aria-hidden="true"
                />
              </button>
              {open ? (
                <ul className="mt-0.5 flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = item.id === activeId;
                    return (
                      <li key={`${group.id}-${item.label}`}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? "location" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]",
                            active
                              ? "border border-[rgba(255,90,31,0.3)] bg-[rgba(255,90,31,0.08)] font-semibold text-[#C2410C]"
                              : "border border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]",
                          )}
                        >
                          {Icon ? (
                            <Icon
                              className={cn("h-4 w-4 shrink-0", active ? "text-[#FF5A1F]" : "text-[var(--color-text-muted)]")}
                              aria-hidden="true"
                            />
                          ) : (
                            <span className="w-4" aria-hidden="true" />
                          )}
                          <span className="min-w-0 truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="border-t border-[var(--color-border)] p-3">
        <div className="rounded-[14px] border border-[rgba(255,90,31,0.16)] bg-[rgba(255,90,31,0.05)] p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <Headphones className="h-4 w-4 text-[#FF5A1F]" aria-hidden="true" />
            <p className="text-sm font-bold text-[var(--color-text-primary)]">Need help?</p>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
            Questions about our brand? We&apos;re here to help.
          </p>
          <Link
            href="/contact?topic=partnerships"
            onClick={onNavigate}
            className="inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-[#FF5A1F] text-sm font-bold text-white transition hover:bg-[#e04e18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
          >
            Contact Brand Team
          </Link>
        </div>
      </div>
    </nav>
  );
}
