import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutSuccessClient } from "./success-client";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const pick = (v: any): string | undefined => {
    if (Array.isArray(v)) return v[0];
    return typeof v === "string" ? v : undefined;
  };
  const status = pick(sp.status)?.toLowerCase();
  const cancelled = pick(sp.cancelled)?.toLowerCase() === "true" || pick(sp.cancel)?.toLowerCase() === "true";

  const rawRef = pick(sp.OrderMerchantReference)?.trim();
  const orderId =
    pick(sp.orderId)?.trim() ||
    pick(sp.order_id)?.trim() ||
    pick(sp.order)?.trim() ||
    rawRef?.split(":")[0];

  if (status === "failed" || status === "cancelled" || cancelled) {
    return redirect(`/checkout?error=Payment failed or was cancelled.&orderId=${orderId}`);
  }

  if (!orderId) {
    console.warn("[CheckoutSuccess] No orderId found in searchParams", sp);
    notFound();
  }

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
    .eq("id", orderId)
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

