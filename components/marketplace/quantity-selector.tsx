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

export function QuantitySelector({ quantity, onChange, max = 99, min = 1 }: QuantitySelectorProps) {
  return (
    <div className="flex items-center gap-0.5 bg-zinc-50 dark:bg-surface/50 border border-zinc-200 dark:border-border rounded-none p-0.5 h-10">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-none text-zinc-400 hover:bg-surface dark:hover:bg-zinc-800 hover:text-[var(--color-accent)] transition-all"
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <div className="w-8 text-center font-black text-sm text-zinc-800 dark:text-text-secondary">
        {quantity}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-none text-zinc-400 hover:bg-surface dark:hover:bg-zinc-800 hover:text-[var(--color-accent)] transition-all"
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

