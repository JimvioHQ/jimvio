"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPasswordRequirements } from "@/lib/auth/password-rules";

export function PasswordRequirements({ password }: { password: string }) {
  const requirements = getPasswordRequirements(password);
  const visible = password.length > 0;
  const metCount = requirements.filter((r) => r.met).length;
  const allMet = metCount === requirements.length;

  if (!visible) return null;

  return (
    <div
      className={cn(
        "mt-2.5 rounded-xl border px-3 py-2.5 transition-[border-color,background-color] duration-200",
        allMet
          ? "border-[#FF5A1F]/25 bg-[#FF5A1F]/[0.04]"
          : "border-zinc-200/90 bg-zinc-50/70 dark:border-border dark:bg-surface-secondary/30",
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">
          Password checklist
        </p>
        <p
          className={cn(
            "text-[11px] font-semibold tabular-nums",
            allMet ? "text-[#FF5A1F]" : "text-zinc-400",
          )}
        >
          {metCount}/{requirements.length}
          <span className="sr-only">
            {allMet ? " — all requirements met" : " requirements met"}
          </span>
        </p>
      </div>

      <ul
        className="grid grid-cols-1 gap-1.5 sm:grid-cols-2"
        aria-label="Password requirements"
      >
        {requirements.map((req) => (
          <li
            key={req.id}
            className={cn(
              "flex items-center gap-2 text-[12px] leading-tight transition-[color,opacity] duration-150 motion-reduce:transition-none",
              req.met
                ? "font-semibold text-zinc-800 dark:text-zinc-100"
                : "font-medium text-zinc-400 opacity-80 dark:text-zinc-500",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,color] duration-150 motion-reduce:transition-none",
                req.met
                  ? "border-[#FF5A1F] bg-[#FF5A1F] text-white"
                  : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-transparent",
              )}
              aria-hidden
            >
              {req.met ? (
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              ) : (
                <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              )}
            </span>
            <span>
              {req.label}
              <span className="sr-only">
                {req.met ? " — met" : " — not met"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
