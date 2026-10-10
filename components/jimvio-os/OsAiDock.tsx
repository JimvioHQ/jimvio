"use client";

import { memo } from "react";
import { Sparkles } from "lucide-react";
import { useAIStore } from "@/lib/store/use-ai-store";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { cn } from "./os-ui";

/**
 * Collapsed AI Copilot dock — a small floating pill shown only while the
 * assistant is fully closed. `JimvioCopilot` already owns its own minimized
 * pill for the "open but minimized" state, so this never renders alongside it.
 * Desktop-only; sits above the OS status bar, below command center/copilot z-index.
 */
export const OsAiDock = memo(function OsAiDock() {
  const isAssistantOpen = useAIStore((s) => s.isAssistantOpen);
  const openAssistant = useAIStore((s) => s.openAssistant);
  const reducedMotion = usePrefersReducedMotion();

  if (isAssistantOpen) return null;

  return (
    <button
      type="button"
      onClick={() => openAssistant()}
      aria-label="Open Jimvio AI"
      className={cn(
        "fixed bottom-11 right-4 z-[60] hidden items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[12.5px] font-semibold text-[var(--color-text-primary)] shadow-lg transition-[transform,opacity] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50 lg:flex",
        !reducedMotion && "duration-200",
      )}
      style={{ boxShadow: "0 10px 32px rgba(0,0,0,0.12)" }}
    >
      <span
        className="grid size-6 place-items-center rounded-full text-white"
        style={{ background: "linear-gradient(135deg, #FF5A1F, #ff7a45)" }}
        aria-hidden
      >
        <Sparkles className="size-3.5" />
      </span>
      AI
    </button>
  );
});
