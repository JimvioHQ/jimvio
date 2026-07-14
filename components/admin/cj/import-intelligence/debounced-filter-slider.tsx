"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Filter range slider — native input (no Radix) to avoid mount-time onValueChange loops.
 * Parent commits ONLY on pointer release (mouseup / touchend).
 */
export function DebouncedFilterSlider({
  label,
  value: committedValue,
  onCommit,
  min,
  max,
  step = 1,
  formatValue,
  className,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(committedValue);
  const onCommitRef = useRef(onCommit);
  const committedRef = useRef(committedValue);
  const pointerActiveRef = useRef(false);

  onCommitRef.current = onCommit;
  committedRef.current = committedValue;

  // Sync external filter resets only — never while pointer is down
  useEffect(() => {
    if (pointerActiveRef.current) return;
    setLocalValue((prev) => (prev === committedValue ? prev : committedValue));
  }, [committedValue]);

  const display = formatValue ? formatValue(localValue) : String(localValue);

  const commit = (next: number) => {
    setLocalValue(next);
    if (next !== committedRef.current) {
      onCommitRef.current(next);
    }
  };

  return (
    <div className={cn("space-y-1.5 pt-1", className)}>
      <span className="text-[10.5px] text-[var(--color-text-muted)]">
        {label}: {display}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        aria-label={label}
        onPointerDown={() => {
          pointerActiveRef.current = true;
        }}
        onChange={(e) => {
          setLocalValue(Number(e.target.value));
        }}
        onPointerUp={(e) => {
          pointerActiveRef.current = false;
          commit(Number(e.currentTarget.value));
        }}
        onPointerCancel={() => {
          pointerActiveRef.current = false;
        }}
        onKeyUp={(e) => {
          if (
            e.key === "Enter" ||
            e.key === " " ||
            e.key === "ArrowLeft" ||
            e.key === "ArrowRight" ||
            e.key === "ArrowUp" ||
            e.key === "ArrowDown"
          ) {
            commit(Number(e.currentTarget.value));
          }
        }}
        className={cn(
          "w-full h-1.5 cursor-pointer appearance-none rounded-full py-1",
          "bg-[var(--color-border)]",
          "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full",
          "[&::-webkit-slider-runnable-track]:bg-[var(--color-border)]",
          "[&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
          "[&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--color-accent)]",
          "[&::-webkit-slider-thumb]:bg-[var(--color-surface)]",
          "[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:-mt-[5px]",
          "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full",
          "[&::-moz-range-track]:bg-[var(--color-border)]",
          "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
          "[&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--color-accent)]",
          "[&::-moz-range-thumb]:bg-[var(--color-surface)]"
        )}
      />
    </div>
  );
}
