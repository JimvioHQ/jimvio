"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPasswordRequirements } from "@/lib/auth/password-rules";

export function PasswordRequirements({ password }: { password: string }) {
  const requirements = getPasswordRequirements(password);
  const visible = password.length > 0;

  if (!visible) return null;

  return (
    <ul
      className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2"
      aria-label="Password requirements"
    >
      {requirements.map((req) => (
        <li
          key={req.id}
          className={cn(
            "flex items-center gap-2 text-[12px] font-medium transition-colors",
            req.met
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-zinc-400 dark:text-zinc-500",
          )}
        >
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
              req.met
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-zinc-300 dark:border-zinc-600",
            )}
            aria-hidden
          >
            {req.met ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : null}
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
  );
}
