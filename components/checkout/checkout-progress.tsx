"use client";

import React from "react";
import { Truck, CreditCard, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1 as const, label: "Payment", icon: CreditCard },
  { id: 2 as const, label: "Shipping", icon: Truck },
  { id: 3 as const, label: "Review", icon: ClipboardCheck },
];

export function CheckoutProgress({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  return (
    <nav className="mb-8 lg:mb-10" aria-label="Checkout progress">
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-y-2 max-w-xl mx-auto px-2">
        {STEPS.flatMap((step, i) => {
          const Icon = step.icon;
          const done = activeStep > step.id;
          const current = activeStep === step.id;
          const cell = (
            <div key={`step-${step.id}`} className="flex flex-col items-center gap-2 min-w-0">
              <div
                className={cn(
                  "flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border-2 transition-colors",
                  done && "border-[var(--color-accent)] bg-[var(--color-accent)] text-white",
                  current &&
                    !done &&
                    "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)] shadow-[0_0_0_4px_var(--color-accent-light)]",
                  !done && !current && "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                )}
              >
                <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-semibold text-center leading-tight",
                  current || done ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
                )}
              >
                {step.label}
              </span>
            </div>
          );
          if (i === STEPS.length - 1) return [cell];
          const line = (
            <div
              key={`line-${i}`}
              className={cn(
                "h-0.5 mt-[18px] rounded-full min-w-[2rem]",
                activeStep > step.id ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
              )}
              aria-hidden
            />
          );
          return [cell, line];
        })}
      </div>
    </nav>
  );
}
