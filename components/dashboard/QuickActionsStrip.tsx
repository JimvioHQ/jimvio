import { Link2, Target, ShoppingBag, PenLine, Wallet, ArrowRight } from "lucide-react";
import type { QuickAction } from "@/types/dashboard";

const ICONS: Record<string, React.ReactNode> = {
  "Create Affiliate Link": <Link2 size={18} aria-hidden="true" />,
  "Join Campaign": <Target size={18} aria-hidden="true" />,
  "Browse Products": <ShoppingBag size={18} aria-hidden="true" />,
  "Create Post": <PenLine size={18} aria-hidden="true" />,
  "Request Withdrawal": <Wallet size={18} aria-hidden="true" />,
};

export function QuickActionsStrip({ actions }: { actions: QuickAction[] }) {
  return (
    <div>
      <p className="text-[13px] font-bold text-text-primary mb-3">Quick Actions</p>
      <div className="flex gap-2.5">
        {actions.map((action) => (
          <button
            key={action.label}
            className="flex-1 flex items-center justify-between gap-2.5 bg-surface border border-border rounded-md px-3.5 py-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group text-left"
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: action.bgColor, color: action.accentColor }}
              >
                {ICONS[action.label]}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-text-primary leading-tight">{action.label}</p>
                <p className="text-[11px] text-text-muted leading-tight mt-0.5">{action.sub}</p>
              </div>
            </div>
            <ArrowRight
              size={14}
              aria-hidden="true"
              style={{ color: action.accentColor }}
              className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
