import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type RightRailCardProps = {
  title: string;
  action?: { label: string; href: string };
  badge?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: boolean;
};

export function RightRailCard({
  title,
  action,
  badge,
  headerExtra,
  children,
  className,
  padding = true,
}: RightRailCardProps) {
  return (
    <div className={cn("rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm", padding && "p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
          {badge && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-500">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          {action && (
            <Link href={action.href} className="text-xs font-medium text-orange-500 hover:underline">
              {action.label}
            </Link>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
