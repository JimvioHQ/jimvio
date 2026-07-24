"use client";

import { useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAiModerationProvider,
  type AiNativeContext,
} from "@/lib/ai/native";

const SEVERITY: Record<string, string> = {
  low: "text-amber-700 bg-amber-500/10",
  medium: "text-orange-700 bg-orange-500/10",
  high: "text-rose-700 bg-rose-500/10",
};

export function AiModerationPanel({
  context,
  className,
}: {
  context: AiNativeContext;
  className?: string;
}) {
  const signals = useMemo(() => {
    const result = getAiModerationProvider().scan(context);
    return Array.isArray(result) ? result : [];
  }, [context]);

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="AI moderation"
    >
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <ShieldAlert className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
        AI moderation
      </h3>
      <ul className="mt-3 space-y-2">
        {signals.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-[var(--color-border)] px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
                {s.kind.replace("_", " ")}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  SEVERITY[s.severity]
                )}
              >
                {s.severity}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{s.sample}</p>
            <p className="mt-1 text-[12.5px] font-medium text-[var(--color-text-primary)]">
              {s.recommendation}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
