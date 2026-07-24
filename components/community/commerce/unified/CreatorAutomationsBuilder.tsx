"use client";

import { useEffect } from "react";
import {
  ArrowDown,
  Plus,
  Power,
  Workflow,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { useClientReady } from "@/lib/community/use-client-ready";
import {
  AUTOMATION_STEP_KINDS,
  AUTOMATION_STEP_LABELS,
  createDefaultPurchaseFlow,
  useCommerceAutomationsStore,
  type AutomationStepKind,
} from "@/lib/community/commerce/unified";

export function CreatorAutomationsBuilder({
  communityId,
  className,
}: {
  communityId: string;
  className?: string;
}) {
  const clientReady = useClientReady();
  const flowsRaw = useCommerceAutomationsStore(
    useShallow((s) => s.flows.filter((f) => f.communityId === communityId))
  );
  const upsertFlow = useCommerceAutomationsStore((s) => s.upsertFlow);
  const toggleFlow = useCommerceAutomationsStore((s) => s.toggleFlow);
  const setSteps = useCommerceAutomationsStore((s) => s.setSteps);
  const flows = clientReady ? flowsRaw : [];

  useEffect(() => {
    if (!clientReady || !communityId) return;
    const existing = useCommerceAutomationsStore
      .getState()
      .flowsForCommunity(communityId);
    if (existing.length === 0) {
      upsertFlow(createDefaultPurchaseFlow(communityId));
    }
  }, [clientReady, communityId, upsertFlow]);

  const flow = flows[0];

  function addStep(kind: AutomationStepKind) {
    if (!flow) return;
    if (flow.steps.includes(kind)) return;
    setSteps(flow.id, [...flow.steps, kind]);
  }

  function removeStep(kind: AutomationStepKind) {
    if (!flow) return;
    if (kind === "new_purchase") return;
    setSteps(
      flow.id,
      flow.steps.filter((s) => s !== kind)
    );
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Creator automations"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            <Workflow className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
            Creator automations
          </h3>
          <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
            Visual purchase → membership → course → welcome flow.
          </p>
        </div>
        {flow && (
          <button
            type="button"
            onClick={() => toggleFlow(flow.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
              flow.enabled
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                : "border-[var(--color-border)] text-[var(--color-text-muted)]"
            )}
          >
            <Power className="h-3.5 w-3.5" aria-hidden />
            {flow.enabled ? "Enabled" : "Paused"}
          </button>
        )}
      </div>

      {!clientReady || !flow ? (
        <p className="mt-4 text-[13px] text-[var(--color-text-muted)]">
          Loading automation canvas…
        </p>
      ) : (
        <>
          <p className="mt-3 text-[13px] font-semibold text-[var(--color-text-primary)]">
            {flow.name}
          </p>
          <ol className="mt-3 space-y-0">
            {flow.steps.map((step, i) => (
              <li key={step} className="flex flex-col items-stretch">
                <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-subtle)] text-[11px] font-black text-[var(--color-accent)]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {AUTOMATION_STEP_LABELS[step]}
                  </span>
                  {step !== "new_purchase" && (
                    <button
                      type="button"
                      onClick={() => removeStep(step)}
                      className="text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-rose-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {i < flow.steps.length - 1 && (
                  <div className="flex justify-center py-1 text-[var(--color-text-muted)]">
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Add step
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {AUTOMATION_STEP_KINDS.filter((k) => !flow.steps.includes(k)).map(
                (kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => addStep(kind)}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                  >
                    <Plus className="h-3 w-3" aria-hidden />
                    {AUTOMATION_STEP_LABELS[kind]}
                  </button>
                )
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
