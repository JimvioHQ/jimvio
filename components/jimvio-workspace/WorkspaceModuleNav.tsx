"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { WorkspaceModule } from "@/lib/jimvio-workspace/types";
import { useAIStore } from "@/lib/store/use-ai-store";

export function WorkspaceModuleNav({ modules }: { modules: WorkspaceModule[] }) {
  const openAssistant = useAIStore((s) => s.openAssistant);

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      role="navigation"
      aria-label="Jimvio workspace modules"
    >
      {modules.map((mod) => {
        if (mod.href === "#open-ai") {
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => openAssistant()}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-left transition-[transform,border-color] duration-200 hover:scale-[1.02] hover:border-[var(--color-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
              style={{ willChange: "transform" }}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-[var(--color-accent)]" />
                <span className="text-[11px] font-bold text-[var(--color-text-primary)]">{mod.label}</span>
                {mod.badge && (
                  <span className="rounded-full bg-[var(--color-accent)]/10 px-1.5 text-[8px] font-bold text-[var(--color-accent)]">
                    {mod.badge}
                  </span>
                )}
              </span>
              <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{mod.description}</p>
            </button>
          );
        }

        return (
          <Link
            key={mod.id}
            href={mod.href}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 transition-[transform,border-color] duration-200 hover:scale-[1.02] hover:border-[var(--color-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
            style={{ willChange: "transform" }}
          >
            <span className="text-[11px] font-bold text-[var(--color-text-primary)]">{mod.label}</span>
            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{mod.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
