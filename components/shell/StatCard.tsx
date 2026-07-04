import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type StatCardProps = {
  icon: ReactNode;
  value: string | number;
  label: string;
  delta?: string;
  className?: string;
};

export function StatCard({ icon, value, label, delta, className }: StatCardProps) {
  const isPositive = delta?.startsWith("+");

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-4",
        className
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 text-gray-500">
        <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      </div>
      <p className="text-xl font-semibold tabular-nums text-gray-900">{value}</p>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">{label}</p>
        {delta && (
          <span
            className={cn(
              "text-[11px] font-medium",
              isPositive ? "text-green-500" : delta.startsWith("-") ? "text-red-500" : "text-gray-400"
            )}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
