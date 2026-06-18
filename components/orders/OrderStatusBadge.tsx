"use client";

import { StatusPill } from "@/components/ui/admin";
import { cn } from "@/lib/utils";

/** Customer-facing order status — uses admin StatusPill (dark-mode safe). */
export function OrderStatusBadge({
  status,
  className,
  size = "sm",
}: {
  status: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const key = (status ?? "pending").toLowerCase().replace(/\s+/g, "_");
  return (
    <span className={cn(className)}>
      <StatusPill status={key} size={size} />
    </span>
  );
}
