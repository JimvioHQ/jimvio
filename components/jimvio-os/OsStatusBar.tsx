"use client";

import { memo } from "react";
import { useAIStore } from "@/lib/store/use-ai-store";
import { cn } from "./os-ui";

type StatusTone = "ready" | "busy" | "idle";

function StatusDot({ tone }: { tone: StatusTone }) {
  const color =
    tone === "busy" ? "bg-amber-500" : tone === "idle" ? "bg-[var(--color-text-muted)]" : "bg-emerald-500";
  return <span className={cn("size-1.5 shrink-0 rounded-full", color)} aria-hidden />;
}

function StatusItem({
  tone,
  label,
  value,
}: {
  tone: StatusTone;
  label: string;
  value: string | number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusDot tone={tone} />
      {label} <span className="font-semibold text-[var(--color-text-secondary)]">{value}</span>
    </span>
  );
}

type OsStatusBarProps = {
  /** Optional — omit to hide the notifications readout entirely. */
  notificationsCount?: number;
  className?: string;
};

/**
 * Minimal macOS-like desktop status bar — Sync / AI / Notifications / Connection / Jobs.
 * Presentation only; hidden on mobile (CreatorOsMobileNav owns that space there).
 */
export const OsStatusBar = memo(function OsStatusBar({ notificationsCount, className }: OsStatusBarProps) {
  const aiStatus = useAIStore((s) => s.status);
  const aiBusy = aiStatus === "thinking" || aiStatus === "streaming";
  const aiOffline = aiStatus === "offline";
  const aiLabel = aiBusy ? "Thinking" : aiOffline ? "Offline" : "Ready";
  const aiTone: StatusTone = aiBusy ? "busy" : aiOffline ? "idle" : "ready";

  return (
    <div
      role="status"
      aria-label="Jimvio OS status"
      className={cn(
        "hidden h-[30px] shrink-0 items-center gap-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 text-[10.5px] font-medium text-[var(--color-text-muted)] backdrop-blur-md lg:flex",
        className,
      )}
    >
      <StatusItem tone="ready" label="Sync" value="Ready" />
      <StatusItem tone={aiTone} label="AI" value={aiLabel} />
      {typeof notificationsCount === "number" && (
        <StatusItem tone={notificationsCount > 0 ? "busy" : "idle"} label="Notifications" value={notificationsCount} />
      )}
      <StatusItem tone="ready" label="Connection" value="Online" />
      <span className="ml-auto">
        <StatusItem tone="idle" label="Jobs" value="Idle" />
      </span>
    </div>
  );
});
