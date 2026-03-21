import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, icon, iconRight, ...props }, ref) => {
    const paddingLeft = icon ? "2.25rem" : "0.75rem";
    const paddingRight = iconRight ? "2.25rem" : "0.75rem";
    return (
      <div className="flex flex-col w-full text-left">
        {label && (
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type={type}
            dir="ltr"
            style={{
              textAlign: "left",
              paddingLeft,
              paddingRight,
              paddingTop: "0.5rem",
              paddingBottom: "0.5rem",
            }}
            className={cn(
              "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm leading-normal text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
              "focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-0 transition-[box-shadow,border-color] duration-150",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "shadow-[var(--shadow-sm)] box-border min-h-[38px]",
              error && "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20",
              className
            )}
            ref={ref}
            {...props}
          />
          {iconRight && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 [&_button]:flex [&_button]:items-center [&_button]:justify-center">
              {iconRight}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[var(--color-danger)] mt-0.5">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
