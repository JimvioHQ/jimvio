"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { type Checklist, computeProgress, listChecklistForIntent, type WelcomeIntent } from "@/lib/growth/onboarding-checklist";

export function OnboardingChecklist({
  intent,
  checklist = {},
  onUpdated,
}: {
  intent: WelcomeIntent;
  checklist?: Checklist;
  onUpdated?: (checklist: Checklist, progress: number) => void;
}) {
  const [state, setState] = useState(checklist);
  const [saving, setSaving] = useState<string | null>(null);
  const items = listChecklistForIntent(intent);
  const progress = computeProgress(state, intent);

  async function markDone(key: string) {
    if (state[key]?.done || saving) return;
    setSaving(key);
    const response = await fetch("/api/growth/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "mark_checklist", key }),
    });
    const result = await response.json();
    if (response.ok) {
      const next = result.checklist as Checklist;
      setState(next);
      onUpdated?.(next, result.progress_percent);
    }
    setSaving(null);
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-[var(--color-text-primary)]">Your next steps</h2>
        <span className="text-sm font-semibold text-[#fd5000]">{progress}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
        <div className="h-full rounded-full bg-[#fd5000] transition-all" style={{ width: `${progress}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => {
          const done = state[item.key]?.done;
          return (
            <li key={item.key} className="flex items-center gap-3 text-sm">
              <button
                type="button"
                aria-label={`Mark ${item.label} complete`}
                onClick={() => markDone(item.key)}
                className="text-[#fd5000]"
              >
                <CheckCircle2 className={done ? "h-5 w-5 fill-[#fd5000] text-white" : "h-5 w-5"} />
              </button>
              <Link href={item.href} className={done ? "text-[var(--color-text-muted)] line-through" : "text-[var(--color-text-primary)] hover:text-[#fd5000]"}>
                {saving === item.key ? "Saving…" : item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
