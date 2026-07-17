"use client";

import { Sparkles } from "lucide-react";
import { OS_AI_ENTRIES } from "@/lib/jimvio-os";
import type { OsAiContext } from "@/lib/jimvio-os/types";
import { useAIStore } from "@/lib/store/use-ai-store";
import { usePathname } from "next/navigation";

function resolveContext(pathname: string): OsAiContext {
  if (pathname.startsWith("/marketplace")) return "marketplace";
  if (pathname.includes("/orders")) return "orders";
  if (pathname.includes("/analytics")) return "analytics";
  if (pathname.includes("/communities")) return "communities";
  if (pathname.includes("/affiliate")) return "affiliate";
  return "default";
}

export function OsAiEntry() {
  const pathname = usePathname();
  const openAssistant = useAIStore((s) => s.openAssistant);
  const context = resolveContext(pathname ?? "");
  const entry = OS_AI_ENTRIES.find((e) => e.context === context) ?? OS_AI_ENTRIES[OS_AI_ENTRIES.length - 1];

  return (
    <button
      type="button"
      onClick={() => openAssistant()}
      className="flex w-full items-start gap-3 rounded-xl border border-dashed border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 px-3 py-2.5 text-left transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
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
