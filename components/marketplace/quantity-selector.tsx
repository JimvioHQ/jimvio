"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  quantity: number;
  onChange: (val: number) => void;
  max?: number;
  min?: number;
}

export function QuantitySelector({
  quantity,
  onChange,
  max = 99,
  min = 1,
}: QuantitySelectorProps) {
  return (
    <div
      className={cn(
        "flex h-10 items-center gap-1 rounded-xl border border-[var(--color-border)]",
        "bg-[var(--color-surface-secondary)] p-1",
      )}
      role="group"
      aria-label="Quantity"
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-lg text-[var(--color-text-muted)]",
          "transition-[transform,background-color,color] duration-200",
          "hover:bg-[var(--color-surface)] hover:text-[var(--color-accent)]",
          "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-1",
          "active:scale-95",
          "disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-muted)]",
        )}
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>

      <div
        className="min-w-[2.25rem] select-none text-center text-sm font-bold tabular-nums text-[var(--color-text-primary)]"
        aria-live="polite"
        aria-atomic="true"
      >
        {quantity}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-lg text-[var(--color-text-muted)]",
          "transition-[transform,background-color,color] duration-200",
          "hover:bg-[var(--color-surface)] hover:text-[var(--color-accent)]",
          "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-1",
          "active:scale-95",
          "disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-muted)]",
        )}
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        aria-label="Increase quantity"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
