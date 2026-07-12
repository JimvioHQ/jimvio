"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { dsFieldErrorClass, dsFieldHelperClass, dsFieldLabelClass, dsFieldSuccessClass } from "@/lib/design-system";

const inputVariants = cva(
  "ds-focus-ring w-full border-[1.5px] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-[border-color,box-shadow] duration-200 hover:border-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:opacity-[var(--ds-opacity-disabled)]",
  {
    variants: {
      size: {
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-[13px]",
        md: "h-10 rounded-[var(--radius-md)] px-3.5 text-sm",
        lg: "h-11 rounded-[var(--radius-md)] px-4 text-[15px]",
      },
      state: {
        default: "border-[var(--color-border)] focus:border-[var(--color-accent)] focus:shadow-[var(--shadow-glow)]",
        error: "border-[var(--color-danger)] focus:border-[var(--color-danger)]",
        success: "border-[var(--color-success)] focus:border-[var(--color-success)]",
      },
    },
    defaultVariants: { size: "md", state: "default" },
  },
);

export type DsInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> &
  VariantProps<typeof inputVariants> & {
    label?: string;
    helperText?: string;
    error?: string;
    success?: string;
    required?: boolean;
    optional?: boolean;
    loading?: boolean;
  };

export const DsInput = React.forwardRef<HTMLInputElement, DsInputProps>(
  ({ className, size, label, helperText, error, success, required, optional, loading, disabled, ...props }, ref) => {
    const state = error ? "error" : success ? "success" : "default";
    return (
      <div className="w-full">
        {label && (
          <label className={dsFieldLabelClass}>
            {label}
            {required && <span className="text-[var(--color-danger)]"> *</span>}
            {optional && <span className="font-normal text-[var(--color-text-muted)]"> (optional)</span>}
          </label>
        )}
        <input
          ref={ref}
          disabled={disabled || loading}
          aria-invalid={!!error}
          aria-busy={loading}
          className={cn(inputVariants({ size, state }), className)}
          {...props}
        />
        {error && <p className={dsFieldErrorClass} role="alert">{error}</p>}
        {success && !error && <p className={dsFieldSuccessClass}>{success}</p>}
        {helperText && !error && !success && <p className={dsFieldHelperClass}>{helperText}</p>}
      </div>
    );
  },
);
DsInput.displayName = "DsInput";

export const DsTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    helperText?: string;
    error?: string;
    success?: string;
  }
>(({ className, label, helperText, error, success, ...props }, ref) => (
  <div className="w-full">
    {label && <label className={dsFieldLabelClass}>{label}</label>}
    <textarea
      ref={ref}
      className={cn(
        "ds-focus-ring min-h-[100px] w-full resize-y rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:shadow-[var(--shadow-glow)]",
        error && "border-[var(--color-danger)]",
        success && "border-[var(--color-success)]",
        className,
      )}
      {...props}
    />
    {error && <p className={dsFieldErrorClass}>{error}</p>}
    {helperText && !error && <p className={dsFieldHelperClass}>{helperText}</p>}
  </div>
));
DsTextarea.displayName = "DsTextarea";

export const DsSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; helperText?: string; error?: string }
>(({ className, label, helperText, error, children, ...props }, ref) => (
  <div className="w-full">
    {label && <label className={dsFieldLabelClass}>{label}</label>}
    <select
      ref={ref}
      className={cn(
        "ds-focus-ring h-10 w-full rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm",
        error && "border-[var(--color-danger)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    {error && <p className={dsFieldErrorClass}>{error}</p>}
    {helperText && !error && <p className={dsFieldHelperClass}>{helperText}</p>}
  </div>
));
DsSelect.displayName = "DsSelect";
