"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAiPersonalizationProvider,
  type AiNativeContext,
} from "@/lib/ai/native";
import { useAIStore } from "@/lib/store/use-ai-store";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";

export function AiPersonalizationRail({
  context,
  className,
}: {
  context: AiNativeContext;
  className?: string;
}) {
  const openAssistant = useAIStore((s) => s.openAssistant);
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);

  const items = useMemo(() => {
    const result = getAiPersonalizationProvider().personalize(context);
    return Array.isArray(result) ? result : [];
  }, [context]);

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="AI personalization"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            <Heart className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
            Personalized for you
          </h3>
          <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
            Creators, communities, products, events, courses, campaigns.
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => openCommandCenter({ query: "create a product" })}
            className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)]"
          >
            ⌘K AI
          </button>
          <button
            type="button"
            onClick={() => openAssistant("Summarize this page and recommend next actions.")}
            className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-semibold text-white"
          >
            Open Copilot
          </button>
        </div>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="block h-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 transition hover:border-[var(--color-accent)]/40"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                  {item.kind}
                </p>
                <span className="text-[11px] font-black">{Math.round(item.score)}</span>
              </div>
              <p className="mt-0.5 text-[13px] font-semibold text-[var(--color-text-primary)]">
                {item.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11.5px] text-[var(--color-text-muted)]">
                {item.reason}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
