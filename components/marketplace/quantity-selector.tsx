"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      className="flex items-center gap-0.5 h-10 p-0.5 rounded-sm
                 bg-[var(--color-surface-secondary)]
                 border border-[var(--color-border)]"
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-sm
                   text-[var(--color-text-muted)]
                   hover:bg-[var(--color-surface)]
                   hover:text-orange-500
                   transition-all
                   disabled:opacity-40 disabled:hover:bg-transparent
                   disabled:hover:text-[var(--color-text-muted)]"
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="h-3 w-3" />
      </Button>

      <div
        className="w-8 text-center font-black text-sm
                   text-[var(--color-text-primary)] tabular-nums"
        aria-live="polite"
      >
        {quantity}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-sm
                   text-[var(--color-text-muted)]
                   hover:bg-[var(--color-surface)]
                   hover:text-orange-500
                   transition-all
                   disabled:opacity-40 disabled:hover:bg-transparent
                   disabled:hover:text-[var(--color-text-muted)]"
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        aria-label="Increase quantity"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}