"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-[border-color,box-shadow,transform] duration-200",
  {
    variants: {
      padding: {
        none: "p-0",
        sm: "p-3",
        md: "p-4 sm:p-5",
        lg: "p-6",
      },
      elevation: {
        none: "shadow-none",
        sm: "shadow-[var(--ds-elevation-1)]",
        md: "shadow-[var(--ds-elevation-2)]",
        lg: "shadow-[var(--ds-elevation-3)]",
      },
      interactive: {
        true: "hover:border-[var(--color-accent)]/30 hover:scale-[1.01] ds-gpu cursor-pointer",
        false: "",
      },
    },
    defaultVariants: { padding: "md", elevation: "sm", interactive: false },
  },
);

export type DsCardProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

export const DsCard = React.forwardRef<HTMLDivElement, DsCardProps>(
  ({ className, padding, elevation, interactive, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ padding, elevation, interactive }), className)} {...props} />
  ),
);
DsCard.displayName = "DsCard";

export function DsCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1", className)} {...props} />;
}

export function DsCardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-bold tracking-[var(--ds-tracking-normal)] text-[var(--color-text-primary)]", className)} {...props} />;
}

export function DsCardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--color-text-muted)]", className)} {...props} />;
}

export function DsCardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pt-2", className)} {...props} />;
}

export function DsCardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 pt-4", className)} {...props} />;
}
