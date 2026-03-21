import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  className?: string;
  description?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconColor = "from-primary-600 to-accent-600",
  className,
  description,
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 max-lg:p-3.5 shadow-[var(--shadow-sm)] hover:border-[var(--color-border-strong)] transition-all duration-150",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
        <p className="text-xs max-lg:text-[10px] max-lg:leading-tight font-medium text-[var(--color-text-secondary)] line-clamp-2">
          {title}
        </p>
        {icon && (
          <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", iconColor)}>
            <span className="text-white [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
          </div>
        )}
      </div>
      <p className="text-xl font-bold max-lg:text-[1.125rem] max-lg:tabular-nums text-[var(--color-text-primary)] mb-0.5 break-all sm:break-normal">
        {value}
      </p>
      {description && <p className="text-xs text-[var(--color-text-muted)] mb-1.5">{description}</p>}
      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-[var(--color-success)]" />
          ) : (
            <TrendingDown className="h-3 w-3 text-[var(--color-danger)]" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              isPositive ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
            )}
          >
            {isPositive ? "+" : ""}{change}%
          </span>
          {changeLabel && (
            <span className="text-xs text-[var(--color-text-muted)]">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
