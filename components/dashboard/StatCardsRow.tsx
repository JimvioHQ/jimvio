import { TrendingUp, TrendingDown } from "lucide-react";
import { Sparkline } from "./Sparkline";
import type { StatCard } from "@/types/dashboard";

export function StatCardsRow({ cards }: { cards: StatCard[] }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-surface border border-border rounded-xl p-4 flex items-start gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-muted mb-1 font-medium">{card.label}</p>
            <p className="text-[22px] font-bold tracking-tight text-text-primary leading-none mb-1.5">
              {card.value}
            </p>
            <div className={`flex items-center gap-1 text-[11px] font-medium ${card.up ? "text-[#30a46c]" : "text-[#e5484d]"}`}>
              {card.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {card.change}
            </div>
          </div>
          <div className="flex-shrink-0 mt-1">
            <Sparkline data={card.data} color={card.chartColor} width={80} height={32} />
          </div>
        </div>
      ))}
    </div>
  );
}
