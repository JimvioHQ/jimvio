
import * as React from "react";
import { cn } from "@/lib/utils";

type InputVariant = "default" | "filled" | "pill";
type InputSize = "sm" | "md" | "lg";
type InputState = "default" | "error" | "success";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  success?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  addon?: string;        // e.g. "jimvio.com/"
  addonRight?: string;
  floatingLabel?: boolean;
  variant?: InputVariant;
  inputSize?: InputSize;
}

// ── Size scale maps to your CSS radius + spacing tokens ──────────────────────
const sizes: Record<InputSize, { h: string; text: string; px: string; radius: string }> = {
  sm: { h: "h-[34px]", text: "text-[13px]", px: "px-[10px]", radius: "rounded-sm" },
  md: { h: "h-11", text: "text-[14px]", px: "px-[14px]", radius: "rounded-sm" },
  lg: { h: "h-[52px]", text: "text-[15px]", px: "px-[16px]", radius: "rounded-lg" },
};

// ── Variant styles (bg + border baseline) ────────────────────────────────────
const variants: Record<InputVariant, string> = {
  default: "bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-sm)]",
  filled: "bg-[var(--color-surface-secondary)] border-transparent shadow-none hover:border-[var(--color-border)] focus:bg-[var(--color-surface)]",
  pill: "bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-sm)] !rounded-[var(--radius-full)] px-[18px]",
};

// ── State overrides ──────────────────────────────────────────────────────────
const states: Record<InputState, string> = {
  default: "focus:border-[var(--color-accent)] focus:shadow-[var(--shadow-glow)]",
  error: "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:shadow-[0_0_0_3px_rgba(229,72,77,0.14)]",
  success: "border-[var(--color-success)] focus:border-[var(--color-success)] focus:shadow-[0_0_0_3px_rgba(48,164,108,0.14)]",
};

// ── Component ────────────────────────────────────────────────────────────────
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      error,
      hint,
      success,
      icon,
      iconRight,
      addon,
      addonRight,
      floatingLabel,
      variant = "default",
      inputSize = "md",
      disabled,
      placeholder,
      ...props
    },
    ref
  ) => {
    const sz = sizes[inputSize];
    const state: InputState = error ? "error" : success ? "success" : "default";

    const pl = icon || addon ? "pl-10" : sz.px.split(" ")[0];
    const pr = iconRight || addonRight ? "pr-10" : sz.px.split(" ")[1] ?? sz.px.split(" ")[0];

    // ── Shared input classes ─────────────────────────────────────────────────
    const inputClass = cn(
      "w-full outline-none border-[1.5px]",
      "font-normal tracking-[-0.01em]",
      "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
      "transition-[border-color,box-shadow,background] duration-[180ms] ease-out",
      "disabled:opacity-45 disabled:cursor-not-allowed disabled:bg-[var(--color-bg)]",
      "hover:border-[var(--color-border-strong)]",
      "focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-150",
      icon ? "pl-10" : "px-4",
      sz.h,
      sz.text,
      sz.radius,
      pl,
      pr,
      variants[variant],
      states[state],
      className
    );

    // ── Core <input> ─────────────────────────────────────────────────────────
    const inputEl = (
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        placeholder={floatingLabel ? " " : placeholder}
        className={cn(inputClass, floatingLabel && "pt-4 pb-1 placeholder-transparent peer")}
        {...props}
      />
    );

    // ── Addon wrapper ────────────────────────────────────────────────────────
    const hasAddon = addon || addonRight;

    const body = hasAddon ? (
      <div
        className={cn(
          "flex items-stretch overflow-hidden border-[1.5px]",
          "border-[var(--color-border)] shadow-[var(--shadow-sm)]",
          "focus-within:border-[var(--color-accent)] focus-within:shadow-[var(--shadow-glow)]",
          "transition-[border-color,box-shadow] duration-[180ms]",
          sz.radius
        )}
      >
        {addon && (
          <span className="flex shrink-0 items-center px-3 text-[13px] font-medium tracking-[-0.01em] select-none whitespace-nowrap bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border-r border-[var(--color-border)]">
            {addon}
          </span>
        )}
        {React.cloneElement(inputEl, {
          className: cn(inputEl.props.className, "flex-1 rounded-sm border-none shadow-none focus:shadow-none focus:border-none"),
        })}
        {addonRight && (
          <span className="flex shrink-0 items-center px-3 text-[13px] font-medium tracking-[-0.01em] select-none whitespace-nowrap bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border-l border-[var(--color-border)]">
            {addonRight}
          </span>
        )}
      </div>
    ) : (
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
            {icon}
          </div>
        )}

        {floatingLabel && label ? (
          <>
            {inputEl}
            {/* Float via peer — label rides up on focus / filled */}
            <label
              className={cn(
                "pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2",
                "text-[14px] font-normal text-[var(--color-text-muted)]",
                "transition-[top,font-size,font-weight,color] duration-150 ease-out",
                // floated state
                "peer-focus:top-[11px] peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-[var(--color-accent)] peer-focus:tracking-[0.02em]",
                "peer-[:not(:placeholder-shown)]:top-[11px] peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-[var(--color-accent)] peer-[:not(:placeholder-shown)]:tracking-[0.02em]"
              )}
            >
              {label}
            </label>
          </>
        ) : (
          inputEl
        )}

        {iconRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-[var(--color-text-muted)]">
            {iconRight}
          </div>
        )}
      </div>
    );

    return (
      <div className="flex w-full flex-col">
        {/* Static label — only when not floating */}
        {label && !floatingLabel && (
          <label className="mb-1.5 text-[12px] font-semibold tracking-[-0.01em] text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}

        {body}

        {/* Footer */}
        {error && (
          <p className="mt-1.5 flex items-center gap-1 text-[12px] text-[var(--color-danger)]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
              <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
              <path d="M6 3.5v3M6 8h.01" stroke="currentColor" strokeLinecap="round" />
            </svg>
            {error}
          </p>
        )}
        {success && !error && (
          <p className="mt-1.5 text-[12px] text-[var(--color-success)]">{success}</p>
        )}
        {hint && !error && !success && (
          <p className="mt-1.5 text-[12px] text-[var(--color-text-muted)]">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };