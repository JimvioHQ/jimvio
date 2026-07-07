"use client";

import { Sparkles } from "lucide-react";
import { SUPER_APP_AI_ENTRIES } from "@/lib/jimvio-super-app";
import type { SuperAppContext } from "@/lib/jimvio-super-app/types";
import { useSuperAppStore } from "@/lib/store/use-super-app-store";
import { useAIStore } from "@/lib/store/use-ai-store";

export function SuperAppContextAi() {
  const context = useSuperAppStore((s) => s.context) as SuperAppContext;
  const openAssistant = useAIStore((s) => s.openAssistant);
  const entry =
    SUPER_APP_AI_ENTRIES.find((e) => e.context === context) ??
    SUPER_APP_AI_ENTRIES[SUPER_APP_AI_ENTRIES.length - 1];

  return (
    <button
      type="button"
      onClick={() => openAssistant()}
      className="flex w-full items-start gap-3 rounded-xl border border-dashed border-[var(--color-accent)]/35 bg-[var(--color-accent)]/5 px-3 py-2.5 text-left transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
      style={{ willChange: "transform" }}
      aria-label={`AI: ${entry.placeholder}`}
    >
      <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--color-accent)]" />
      <span>
        <span className="block text-[11px] font-bold text-[var(--color-text-primary)]">{entry.label} · Jimvio AI</span>
        <span className="text-[11px] text-[var(--color-text-muted)]">{entry.placeholder}</span>
        <span className="mt-1 block text-[9px] font-bold uppercase text-[var(--color-accent)]">UI placeholder</span>
      </span>
    </button>
  );
}
