"use client";

import { cn } from "@/lib/utils";
import {
  Clock,
  Settings2,
  Truck,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    classes: {
      sm: string;
      md: string;
    };
    pulse?: boolean;
  }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    classes: {
      sm: "bg-zinc-100 text-zinc-600 border-zinc-200",
      md: "bg-zinc-100 text-zinc-700 border-zinc-200",
    },
    pulse: true,
  },
  processing: {
    label: "Processing",
    icon: Settings2,
    classes: {
      sm: "bg-blue-50 text-blue-600 border-blue-200",
      md: "bg-blue-50 text-blue-700 border-blue-200",
    },
    pulse: true,
  },
  confirmed: {
    label: "Confirmed",
    icon: BadgeCheck,
    classes: {
      sm: "bg-blue-50 text-blue-600 border-blue-200",
      md: "bg-blue-50 text-blue-700 border-blue-200",
    },
  },
  shipped: {
    label: "Shipped",
    icon: Truck,
    classes: {
      sm: "bg-violet-50 text-violet-600 border-violet-200",
      md: "bg-violet-50 text-violet-700 border-violet-200",
    },
    pulse: true,
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle2,
    classes: {
      sm: "bg-emerald-50 text-emerald-600 border-emerald-200",
      md: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    classes: {
      sm: "bg-red-50 text-red-500 border-red-200",
      md: "bg-red-50 text-red-600 border-red-200",
    },
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    classes: {
      sm: "bg-red-50 text-red-500 border-red-200",
      md: "bg-red-50 text-red-600 border-red-200",
    },
  },
  refunded: {
    label: "Refunded",
    icon: RotateCcw,
    classes: {
      sm: "bg-amber-50 text-amber-600 border-amber-200",
      md: "bg-amber-50 text-amber-700 border-amber-200",
    },
  },
};

// ─── Pulse dot ────────────────────────────────────────────────────────────────

function PulseDot({ colorClass }: { colorClass: string }) {
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
          colorClass
        )}
      />
      <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", colorClass)} />
    </span>
  );
}

// ─── Pulse color map ──────────────────────────────────────────────────────────
// Maps the text color class → a bg color class for the dot

const PULSE_COLOR: Record<string, string> = {
  "text-zinc-600": "bg-zinc-400",
  "text-zinc-700": "bg-zinc-400",
  "text-blue-600": "bg-blue-500",
  "text-blue-700": "bg-blue-500",
  "text-violet-600": "bg-violet-500",
  "text-violet-700": "bg-violet-500",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderStatusBadge({
  status,
  className,
  size = "sm",
}: {
  status: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const key = status?.toLowerCase() ?? "pending";
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const colorClass = cfg.classes[size];
  const textColorClass = colorClass.split(" ").find((c) => c.startsWith("text-")) ?? "";
  const dotBgClass = PULSE_COLOR[textColorClass] ?? "bg-current";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border font-semibold transition-colors",
        colorClass,
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        className
      )}
    >
      {cfg.pulse ? (
        <PulseDot colorClass={dotBgClass} />
      ) : (
        <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      )}
      {cfg.label}
    </span>
  );
}