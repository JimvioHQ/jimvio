"use client";

import {
  ShoppingBag, TrendingUp, Package, Truck,
  CircleDot, AlertTriangle,
} from "lucide-react";
import { Tile } from "@/components/ui/admin-server";

export function AdminOrdersKPI({
  totalRevenue,
  aov,
  pendingPayment,
  awaitingShipment,
  inTransit,
  cancelled,
  formatCurrency,
}: {
  totalRevenue: number;
  aov: number;
  pendingPayment: number;
  awaitingShipment: number;
  inTransit: number;
  cancelled: number;
  formatCurrency: (value: number) => string;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Tile label="Revenue" value={formatCurrency(totalRevenue)} sublabel="Paid orders" icon={TrendingUp} tone="success" />
      <Tile label="Avg order" value={formatCurrency(aov)} sublabel="Per paid order" icon={ShoppingBag} />
      <Tile label="Awaiting payment" value={pendingPayment.toLocaleString()} sublabel="Pending" icon={CircleDot} tone={pendingPayment > 10 ? "warn" : "default"} />
      <Tile label="To fulfill" value={awaitingShipment.toLocaleString()} sublabel="Paid · not shipped" icon={Package} tone={awaitingShipment > 0 ? "warn" : "default"} />
      <Tile label="In transit" value={inTransit.toLocaleString()} sublabel="Shipped" icon={Truck} />
      <Tile label="Cancelled" value={cancelled.toLocaleString()} sublabel="In period" icon={AlertTriangle} tone={cancelled > 5 ? "danger" : "default"} />
    </div>
  );
}
