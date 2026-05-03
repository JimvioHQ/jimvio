import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

type FieldError = string | null;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</label>}
        <textarea
          className={cn(
            "flex min-h-[100px] w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] transition-all duration-200 resize-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

function StyledTextarea({ error, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: FieldError;
}) {
  return (
    <textarea
      className={cn(
        "w-full rounded-sm border transition-all duration-150 text-sm font-medium px-4 py-3 resize-none min-h-[100px]",
        "bg-[var(--color-surface)] border-[var(--color-border)]",
        "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
        "outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500",
        error && "border-red-500/60 focus:ring-red-500/40 focus:border-red-500/60",
        className
      )}
      {...props}
    />
  );
}

export { Textarea, StyledTextarea };

