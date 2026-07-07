"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]",
        accent: "bg-[var(--color-accent)]/10 text-[var(--color-accent)]",
        success: "bg-[var(--color-success-light)] text-[var(--color-success)]",
        warning: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
        danger: "bg-[var(--color-danger-light)] text-[var(--color-danger)]",
        outline: "border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function DsBadge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function DsChip({
  className,
  selected,
  onClick,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "ds-focus-ring rounded-full px-3 py-1.5 text-[11px] font-semibold transition-[transform,background-color] duration-200",
        selected
          ? "bg-[var(--color-accent)] text-white"
          : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:scale-[1.02]",
        className,
      )}
      onClick={onClick}
      aria-pressed={selected}
      {...props}
    >
      {children}
    </button>
  );
}

export function DsAvatar({
  src,
  alt,
  fallback,
  size = "md",
  className,
}: {
  src?: string | null;
  alt?: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "size-8 text-[10px]", md: "size-10 text-xs", lg: "size-12 text-sm" };
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--color-accent)]/10 font-bold text-[var(--color-accent)] ring-1 ring-[var(--color-border)]",
        sizes[size],
        className,
      )}
    >
      {src ? <img src={src} alt={alt ?? ""} className="size-full object-cover" /> : fallback.slice(0, 2).toUpperCase()}
    </span>
  );
}
