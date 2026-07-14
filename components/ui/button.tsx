import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-semibold transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
    "rounded-[var(--radius-md)]",
    "text-sm",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-accent-hover)] hover:shadow-[var(--shadow-md)]",
        secondary:
          "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]",
        outline:
          "bg-transparent text-[var(--color-accent)] border border-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)]",
        ghost:
          "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] border border-transparent",
        destructive:
          "bg-[var(--color-danger)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-danger)]/90 hover:shadow-[var(--shadow-md)]",
        subtle:
          "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent-light)] hover:shadow-[0_2px_10px_color-mix(in_srgb,_var(--color-accent)_10%,_transparent)]",
        success:
          "bg-[var(--color-success)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-success)]/90 hover:shadow-[var(--shadow-md)]",
        warning:
          "bg-[var(--color-warning)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-warning)]/90 hover:shadow-[var(--shadow-md)]",
        link: "text-[var(--color-accent)] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-xs",
        lg: "h-12 rounded-[var(--radius-lg)] px-8 text-base",
        xl: "h-14 rounded-[var(--radius-xl)] px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-[var(--radius-sm)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {asChild ? children : (
          <>
            {loading && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            )}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };