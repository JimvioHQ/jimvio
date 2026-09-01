"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { WORKSPACES, type WorkspaceId } from "@/lib/workspace/config";

type WorkspaceRightPanelProps = {
  workspace: WorkspaceId;
};

export function WorkspaceRightPanel({ workspace }: WorkspaceRightPanelProps) {
  const def = WORKSPACES[workspace];
  const panel = def.rightPanel;
  if (!panel) return null;

  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <section>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
          {panel.title}
        </h3>
        <ul className="mt-3 space-y-2">
          {panel.items.map((item) => (
            <li key={item.label}>
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-[13px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <span>{item.label}</span>
                  {item.value && (
                    <span className="text-[11px] font-semibold text-[var(--color-accent)]">
                      {item.value}
                    </span>
                  )}
                </Link>
              ) : (
                <div className="flex items-center justify-between rounded-lg px-2 py-2 text-[13px] text-[var(--color-text-secondary)]">
                  <span>{item.label}</span>
                  {item.value && (
                    <span className="text-[11px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {item.value}
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 p-4">
        <div className="flex items-center gap-2 text-[var(--color-accent)]">
          <Sparkles className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-wide">AI Assistant</span>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
          Get recommendations and insights tailored to your {def.label.toLowerCase()} activity.
        </p>
        <Link
          href="/"
          className="mt-3 inline-flex text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
        >
          Open Mission Control →
        </Link>
      </section>
    </div>
  );
}
