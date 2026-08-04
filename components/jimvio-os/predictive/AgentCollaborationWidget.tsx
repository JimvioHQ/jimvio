"use client";

import { memo, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { getAgentCollaborationChain, type OsWorkspaceMode } from "@/lib/jimvio-os";
import { OsCard, cn } from "../os-ui";

export type AgentCollaborationWidgetProps = {
  mode: OsWorkspaceMode;
  className?: string;
};

/**
 * Agent Collaboration Widget — a calm, human-readable recommendation chain
 * (Agent → Agent → … → Executive), not a technical graph. Advisory only:
 * agents hand off notes to each other, the human still decides everything.
 */
export const AgentCollaborationWidget = memo(function AgentCollaborationWidget({
  mode,
  className,
}: AgentCollaborationWidgetProps) {
  const chain = useMemo(() => getAgentCollaborationChain(mode), [mode]);

  return (
    <OsCard as="section" padding="lg" className={cn("flex flex-col gap-4 rounded-3xl", className)}>
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
          Agent Collaboration
        </h2>
        <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
          How your agents hand off recommendations — advisory only
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
        {chain.map((step, index) => (
          <div key={step.agentId} className="flex items-center gap-3 sm:min-w-[160px] sm:flex-1">
            <div className="flex flex-1 flex-col gap-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3">
              <span className="flex items-center gap-2">
                <span className="text-[18px] leading-none" aria-hidden>
                  {step.emoji}
                </span>
                <span className="truncate text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                  {step.name}
                </span>
              </span>
              <span className="text-[11.5px] leading-relaxed text-[var(--color-text-muted)]">{step.note}</span>
            </div>
            {index < chain.length - 1 && (
              <ArrowRight className="hidden size-4 shrink-0 text-[var(--color-text-muted)] sm:block" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </OsCard>
  );
});

export default AgentCollaborationWidget;
