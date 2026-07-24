"use client";

import { Mic, MicOff, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveHostSeat } from "@/lib/community/live-network";
import { getLiveMediaProvider } from "@/lib/community/live-network";

export function MultiHostStage({
  seats,
  requests,
  onInvite,
  onClearRequest,
  className,
}: {
  seats: LiveHostSeat[];
  requests: string[];
  onInvite: (name: string) => void;
  onClearRequest: (name: string) => void;
  className?: string;
}) {
  const max = getLiveMediaProvider().maxHosts();

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Multi host"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          <Users className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
          Multi-host stage
        </h3>
        <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
          {seats.filter((s) => s.onStage).length}/{max} seats
        </span>
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {seats.map((seat) => (
          <li
            key={seat.id}
            className={cn(
              "rounded-xl border px-3 py-2.5",
              seat.onStage
                ? "border-[var(--color-accent)]/30 bg-[var(--color-accent-subtle)]/40"
                : "border-[var(--color-border)]"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                  {seat.name}
                </p>
                <p className="text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
                  {seat.role}
                  {seat.sharing ? " · sharing" : ""}
                </p>
              </div>
              <span className="text-[var(--color-text-muted)]">
                {seat.micOn ? (
                  <Mic className="h-3.5 w-3.5" aria-label="Mic on" />
                ) : (
                  <MicOff className="h-3.5 w-3.5" aria-label="Mic off" />
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Audience requests
        </p>
        {requests.length === 0 ? (
          <button
            type="button"
            onClick={() => onInvite("Audience member")}
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)]"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden />
            Simulate request
          </button>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {requests.map((name) => (
              <li
                key={name}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-2.5 py-2"
              >
                <span className="text-[12.5px] font-medium">{name}</span>
                <button
                  type="button"
                  onClick={() => onClearRequest(name)}
                  className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-semibold text-white"
                >
                  Bring on stage
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
