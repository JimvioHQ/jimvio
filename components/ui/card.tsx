"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-200",
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
        sm: "shadow-sm",
        md: "shadow-md",
        lg: "shadow-lg",
      },
      interactive: {
        false: "",
        true: "hover:border-[var(--color-border-strong)] hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
        accent: "hover:border-[var(--color-accent)]/30 hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
      },
    },
    defaultVariants: { padding: "md", elevation: "sm", interactive: false },
  },
);

export type CardProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding, elevation, interactive, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ padding, elevation, interactive }), className)} {...props} />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-medium text-[var(--color-text-primary)] leading-tight", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-[var(--color-text-secondary)]", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-2 pt-4", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
