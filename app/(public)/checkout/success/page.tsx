import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutSuccessClient } from "./success-client";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id } = await searchParams;
  if (!order_id) notFound();

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      total_amount,
      currency,
      payment_provider,
      order_items ( product_name, quantity, total_price )
    `
    )
    .eq("id", order_id)
    .single();

  if (error || !order) notFound();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20">
      <div className="max-w-[560px] mx-auto px-4">
        <CheckoutSuccessClient order={order as never} />
      </div>
    </div>
  );
}
