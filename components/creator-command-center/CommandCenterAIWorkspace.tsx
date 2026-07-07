"use client";

import type { ComponentType } from "react";
import {
  BarChart3,
  Flame,
  MessageSquare,
  Package,
  PenLine,
  Percent,
  Search,
  Sparkles,
} from "lucide-react";
import { useAIStore } from "@/lib/store/use-ai-store";
import type { CommandCenterAIPrompt } from "@/lib/creator-command-center/types";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  package: Package,
  pen: PenLine,
  search: Search,
  sparkles: Sparkles,
  flame: Flame,
  percent: Percent,
  message: MessageSquare,
  chart: BarChart3,
};

export function CommandCenterAIWorkspace({ prompts }: { prompts: CommandCenterAIPrompt[] }) {
  const openAssistant = useAIStore((s) => s.openAssistant);

  return (
    <section
      aria-label="Jimvio AI creator workspace"
      className="rounded-2xl border border-[var(--color-border)] p-4 sm:p-5"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 10%, var(--color-surface)), var(--color-surface))",
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
          <Sparkles className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-black text-[var(--color-text-primary)]">Jimvio AI Workspace</h3>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Creator copilot actions — UI ready for backend intelligence.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {prompts.map((prompt) => {
          const Icon = ICONS[prompt.icon] ?? Sparkles;
          return (
            <button
              key={prompt.id}
              type="button"
              onClick={() => openAssistant(prompt.prompt)}
              className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-left transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
              style={{ willChange: "transform" }}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-[var(--color-accent)]" />
              <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">
                {prompt.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
