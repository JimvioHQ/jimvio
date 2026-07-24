"use client";

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientReady } from "@/lib/community/use-client-ready";
import { triggerLabel, useAiAutomationsStore } from "@/lib/ai/native";

export function AiAutomationsBuilder({
  communityId,
  className,
}: {
  communityId: string;
  className?: string;
}) {
  const clientReady = useClientReady();
  const ensureDefaults = useAiAutomationsStore((s) => s.ensureDefaults);
  const toggle = useAiAutomationsStore((s) => s.toggle);
  const flowsRaw = useAiAutomationsStore(
    useShallow((s) => s.flows.filter((f) => f.id.includes(communityId)))
  );
  const flows = clientReady ? flowsRaw : [];

  useEffect(() => {
    if (!clientReady || !communityId) return;
    ensureDefaults(communityId);
  }, [clientReady, communityId, ensureDefaults]);

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="AI automations"
    >
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <Workflow className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
        AI automations
      </h3>
      <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
        When someone joins… sells… engagement drops… campaign finishes.
      </p>
      <ul className="mt-3 space-y-2.5">
        {flows.map((flow) => (
          <li
            key={flow.id}
            className="rounded-xl border border-[var(--color-border)] px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                  {triggerLabel(flow.trigger)}
                </p>
                <ol className="mt-1 space-y-0.5">
                  {flow.steps.map((step) => (
                    <li
                      key={step}
                      className="text-[11.5px] text-[var(--color-text-muted)]"
                    >
                      → {step}
                    </li>
                  ))}
                </ol>
              </div>
              <button
                type="button"
                onClick={() => toggle(flow.id)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                  flow.enabled
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                )}
              >
                {flow.enabled ? "On" : "Off"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
