"use client";

import Link from "next/link";
import type { WorkspaceQuickAction } from "@/lib/jimvio-workspace/types";
import { useAIStore } from "@/lib/store/use-ai-store";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";
import type { LucideIcon } from "lucide-react";

type WorkspaceQuickActionsProps = {
  actions: WorkspaceQuickAction[];
  icons: Record<string, LucideIcon>;
};

export function WorkspaceQuickActions({ actions, icons }: WorkspaceQuickActionsProps) {
  const openAssistant = useAIStore((s) => s.openAssistant);
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      role="list"
      aria-label="Workspace quick actions"
    >
      {actions.map((action) => {
        const Icon = icons[action.icon];
        const content = (
          <>
            <span
              className="mb-2 grid size-9 place-items-center rounded-xl"
              style={{ background: `${action.accent}18`, color: action.accent }}
            >
              {Icon ? <Icon className="size-4" /> : null}
            </span>
            <span className="block text-[11px] font-bold text-[var(--color-text-primary)]">{action.label}</span>
            {action.description && (
              <span className="mt-0.5 block text-[10px] text-[var(--color-text-muted)]">{action.description}</span>
            )}
          </>
        );

        if (action.actionId === "open-ai") {
          return (
            <button
              key={action.id}
              type="button"
              role="listitem"
              onClick={() => openAssistant()}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left transition-[transform,border-color] duration-200 hover:scale-[1.02] hover:border-[var(--color-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
              style={{ willChange: "transform" }}
            >
              {content}
            </button>
          );
        }

        if (action.actionId === "open-command-center") {
          return (
            <button
              key={action.id}
              type="button"
              role="listitem"
              onClick={() => openCommandCenter()}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left transition-[transform,border-color] duration-200 hover:scale-[1.02] hover:border-[var(--color-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
              style={{ willChange: "transform" }}
            >
              {content}
            </button>
          );
        }

        return (
          <Link
            key={action.id}
            href={action.href ?? "#"}
            role="listitem"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-[transform,border-color] duration-200 hover:scale-[1.02] hover:border-[var(--color-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
            style={{ willChange: "transform" }}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}
