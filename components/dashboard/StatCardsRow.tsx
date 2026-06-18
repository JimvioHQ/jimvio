import { BarChart3 } from "lucide-react";
import { Tile } from "@/components/ui/admin-tile";
import type { StatCard } from "@/types/dashboard";

export function StatCardsRow({ cards }: { cards: StatCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Tile
          key={card.label}
          label={card.label}
          value={card.value}
          sublabel={card.change}
          icon={BarChart3}
          tone={card.up ? "success" : "danger"}
        />
      ))}
    </div>
  );
}
