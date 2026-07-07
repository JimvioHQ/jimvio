"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { dsIconStroke } from "@/lib/design-system";

const dsButtonVariants = cva(
  "ds-focus-ring ds-gpu inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[transform,background-color,border-color,box-shadow,opacity] duration-200 disabled:pointer-events-none disabled:opacity-[var(--ds-opacity-disabled)] active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-accent)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-accent-hover)] hover:scale-[1.02]",
        secondary:
          "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
        ghost:
          "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
        outline:
          "border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/5",
        danger:
          "bg-[var(--color-danger)] text-white hover:opacity-90",
        success:
          "bg-[var(--color-success)] text-white hover:opacity-90",
      },
      size: {
        xs: "h-7 rounded-[var(--radius-sm)] px-2.5 text-[11px]",
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-xs",
        md: "h-10 rounded-[var(--radius-md)] px-4 text-sm",
        lg: "h-11 rounded-[var(--radius-md)] px-5 text-sm",
        xl: "h-12 rounded-[var(--radius-lg)] px-6 text-base",
        icon: "size-10 rounded-[var(--radius-md)] p-0",
        "icon-sm": "size-8 rounded-[var(--radius-sm)] p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface DsButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof dsButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const DsButton = React.forwardRef<HTMLButtonElement, DsButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(dsButtonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            style={{ borderWidth: dsIconStroke }}
            aria-hidden
          />
        )}
        {children}
      </Comp>
    );
  },
);
DsButton.displayName = "DsButton";

export const DsFab = React.forwardRef<HTMLButtonElement, DsButtonProps>(
  ({ className, children, ...props }, ref) => (
    <DsButton
      ref={ref}
      size="icon"
      className={cn(
        "fixed bottom-6 right-6 z-[var(--ds-z-modal)] size-14 rounded-full shadow-[var(--shadow-lg)]",
        className,
      )}
      {...props}
    >
      {children}
    </DsButton>
  ),
);
DsFab.displayName = "DsFab";

export { dsButtonVariants };
