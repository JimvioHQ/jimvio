"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { dsFieldLabelClass } from "@/lib/design-system";

export function DsCheckbox({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2", className)}>
      <input
        type="checkbox"
        className="ds-focus-ring size-4 rounded-[4px] border-[var(--color-border)] accent-[var(--color-accent)]"
        {...props}
      />
      {label && <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>}
    </label>
  );
}

export function DsRadio({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2", className)}>
      <input
        type="radio"
        className="ds-focus-ring size-4 accent-[var(--color-accent)]"
        {...props}
      />
      {label && <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>}
    </label>
  );
}

export function DsSwitch({
  label,
  checked,
  onCheckedChange,
  className,
  disabled,
}: {
  label?: string;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2", disabled && "opacity-[var(--ds-opacity-disabled)]", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "ds-focus-ring relative h-6 w-11 rounded-full transition-colors duration-200",
          checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
      {label && <span className={dsFieldLabelClass.replace("mb-1.5 ", "")}>{label}</span>}
    </label>
  );
}
