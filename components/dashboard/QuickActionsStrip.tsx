import { memo } from "react";
import {
  Package,
  Settings,
  ShoppingBag,
  Truck,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { QuickAction } from "@/types/dashboard";

const ICONS: Record<string, React.ReactNode> = {
  "Add Product": <Package size={18} aria-hidden="true" />,
  "View Orders": <Truck size={18} aria-hidden="true" />,
  "Browse Marketplace": <ShoppingBag size={18} aria-hidden="true" />,
  "Open Messages": <MessageSquare size={18} aria-hidden="true" />,
  "Store Settings": <Settings size={18} aria-hidden="true" />,
};

export const QuickActionsStrip = memo(function QuickActionsStrip({
  actions,
}: {
  actions: QuickAction[];
}) {
  return (
    <section aria-label="Quick actions">
      <p className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">
        Quick Actions
      </p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => {
          const inner = (
            <>
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ background: action.bgColor, color: action.accentColor }}
              >
                {ICONS[action.label]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold leading-tight text-[var(--color-text-primary)]">
                  {action.label}
                </p>
                <p className="mt-0.5 truncate text-[11px] leading-tight text-[var(--color-text-muted)]">
                  {action.sub}
                </p>
              </div>
              <ArrowRight
                size={14}
                aria-hidden="true"
                style={{ color: action.accentColor }}
                className="flex-shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
              />
            </>
          );

          const className =
            "group flex w-full items-center gap-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm";

          if (action.href) {
            return (
              <Link key={action.label} href={action.href} className={className}>
                {inner}
              </Link>
            );
          }

          return (
            <button key={action.label} type="button" className={className}>
              {inner}
            </button>
          );
        })}
      </div>
    </section>
  );
});
