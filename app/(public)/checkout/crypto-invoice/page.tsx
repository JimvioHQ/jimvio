import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CryptoInvoiceBridge } from "@/components/checkout/crypto-invoice-bridge";
import type { OrderSummaryItem } from "@/components/checkout/OrderSummary";

export const dynamic = "force-dynamic";

export default async function CryptoInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  if (!orderId) redirect("/checkout");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/checkout/crypto-invoice?orderId=${orderId}`)}`);
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      total_amount,
      currency,
      status,
      order_items (id, product_name, product_image, quantity, unit_price, total_price),
      vendors (business_name)
    `
    )
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .eq("status", "pending")
    .single();

  if (error || !order) {
    redirect("/checkout");
  }

  const rawVendors = order.vendors as { business_name: string } | { business_name: string }[] | null;
  const vendor = Array.isArray(rawVendors) ? rawVendors[0] : rawVendors;

  const rawItems = order.order_items as {
    id: string;
    product_name: string;
    product_image: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];

  const items: OrderSummaryItem[] = (rawItems ?? []).map((i) => ({
    id: i.id,
    product_name: i.product_name,
    product_image: i.product_image,
    quantity: i.quantity,
    unit_price: Number(i.unit_price),
    total_price: Number(i.total_price),
  }));

  const subtotal = items.reduce((s, i) => s + Number(i.total_price), 0);
  const currency = (order.currency || "USD").toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
        <CryptoInvoiceBridge
          orderNumber={order.order_number}
          vendorName={vendor?.business_name ?? null}
          items={items}
          subtotal={subtotal}
          total={subtotal}
          currency={currency}
        />
      </div>
    </div>
  );
}
