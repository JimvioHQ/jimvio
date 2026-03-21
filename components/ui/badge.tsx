import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[var(--radius-full)] px-3.5 py-1.5 text-[12px] font-medium capitalize tracking-[0.04em] transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)]",
        accent:
          "bg-[var(--color-accent-light)] border border-[var(--color-accent)] text-[var(--color-accent)]",
        success:
          "bg-[var(--color-success-light)] border border-[var(--color-success)] text-[var(--color-success)]",
        warning:
          "bg-[var(--color-warning-light)] border border-[var(--color-warning)] text-[var(--color-warning)]",
        destructive:
          "bg-[var(--color-danger-light)] border border-[var(--color-danger)] text-[var(--color-danger)]",
        secondary:
          "bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)]",
        outline:
          "border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] bg-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
