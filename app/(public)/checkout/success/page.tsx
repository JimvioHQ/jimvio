// import React from "react";
// import Link from "next/link";
// import { notFound, redirect } from "next/navigation";
// import { createClient } from "@/lib/supabase/server";
// import { CheckoutSuccessClient } from "./success-client";

// export const dynamic = "force-dynamic";

// export default async function CheckoutSuccessPage({
//   searchParams,
// }: {
//   searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
// }) {
//   const sp = await searchParams;
//   const pick = (v: any): string | undefined => {
//     if (Array.isArray(v)) return v[0];
//     return typeof v === "string" ? v : undefined;
//   };
//   const status = pick(sp.status)?.toLowerCase();
//   const cancelled = pick(sp.cancelled)?.toLowerCase() === "true" || pick(sp.cancel)?.toLowerCase() === "true";

//   const rawRef = pick(sp.OrderMerchantReference)?.trim();
//   const orderId =
//     pick(sp.orderId)?.trim() ||
//     pick(sp.order_id)?.trim() ||
//     pick(sp.order)?.trim() ||
//     rawRef?.split(":")[0];

//   if (status === "failed" || status === "cancelled" || cancelled) {
//     return redirect(`/checkout?error=Payment failed or was cancelled.&orderId=${orderId}`);
//   }
//   else if (status === "") {
//     return redirect(`/checkout?error=Payment failed or was cancelled.`);
//   }

//   if (!orderId) {
//     console.warn("[CheckoutSuccess] No orderId found in searchParams", sp);
//     notFound();
//   }

//   const supabase = await createClient();
//   const { data: order, error } = await supabase
//     .from("orders").select(
//       `
//       id,
//       order_number,
//       total_amount,
//       currency,
//       payment_provider,
//       order_items ( product_name, quantity, total_price )
//     `
//     )
//     .eq("id", orderId)
//     .single();

//   if (error || !order) notFound();

//   return (
//     <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20">
//       <div className="max-w-[560px] mx-auto px-4">
//         <pre>
//           <code>
//             {JSON.stringify(order, null, 2)}
//           </code>
//         </pre>
//         <CheckoutSuccessClient order={order as never} />
//       </div>
//     </div>
//   );
// }

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutSuccessClient } from "./success-client";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  product_name: string;
  quantity: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  payment_provider: string;
  order_items: OrderItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return typeof v === "string" ? v : undefined;
}

function buildErrorRedirect(message: string, orderId?: string): string {
  const params = new URLSearchParams({ error: message });
  if (orderId) params.set("orderId", orderId);
  return `/checkout?${params.toString()}`;
}

// ─── Error UI ─────────────────────────────────────────────────────────────────

function ErrorState({
  title,
  description,
  hint,
}: {
  title: string;
  description: string;
  hint?: string;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight">
            {title}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
            {description}
          </p>
          {hint && (
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              {hint}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <a
            href="/checkout"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--color-text-primary)]
             text-[var(--color-accent)] text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </a>
          <a
            href="/marketplace"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] text-sm font-medium hover:bg-[var(--color-background-secondary)] transition-colors"
          >
            Back to marketplace
          </a>
        </div>

      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const status = pickParam(sp.status)?.toLowerCase();
  const cancelled =
    pickParam(sp.cancelled)?.toLowerCase() === "true" ||
    pickParam(sp.cancel)?.toLowerCase() === "true";

  const rawRef = pickParam(sp.OrderMerchantReference)?.trim();
  const orderId =
    pickParam(sp.orderId)?.trim() ||
    pickParam(sp.order_id)?.trim() ||
    pickParam(sp.order)?.trim() ||
    rawRef?.split(":")[0];

  // ── Payment explicitly failed or cancelled ────────────────────────────────
  if (status === "failed" || status === "cancelled" || cancelled) {
    redirect(buildErrorRedirect("Payment failed or was cancelled.", orderId));
  }

  if (status === "") {
    redirect(buildErrorRedirect("We couldn't confirm your payment status. Please try again."));
  }

  if (!orderId) {
    console.warn("[CheckoutSuccess] No orderId in searchParams:", sp);
    return (
      <ErrorState
        title="Order not found"
        description="We couldn't find your order details. This can happen if you refreshed the page or followed an expired link."
        hint="If you were charged, please contact support with your payment reference."
      />
    );
  }

  // ── Supabase lookup ───────────────────────────────────────────────────────
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items ( product_name, quantity, total_price ),
      transactions ( id, provider, provider_transaction_id, amount, status )
    `
    )
    .eq("id", orderId)
    .single();

  // ── DB error ──────────────────────────────────────────────────────────────
  if (error) {
    console.error("[CheckoutSuccess] Supabase error for orderId:", orderId, error);
    if (error.code === "PGRST116") {
      return (
        <ErrorState
          title="Order not found"
          description={`We couldn't find an order matching ID "${orderId}". It may have been removed or the link is incorrect.`}
          hint="Error code: PGRST116 — no rows returned."
        />
      );
    }

    // Generic DB error
    return (
      <ErrorState
        title="Something went wrong"
        description="We had trouble loading your order. This is on our end — please try refreshing or contact support."
        hint={`Error: ${error.message} (code: ${error.code})`}
      />
    );
  }

  // ── No order data (shouldn't happen if no error, but be safe) ─────────────
  if (!order) {
    console.warn("[CheckoutSuccess] No order data for orderId:", orderId);
    return (
      <ErrorState
        title="Order unavailable"
        description="Your order exists but couldn't be loaded right now. Please refresh the page."
        hint={`Order ID: ${orderId}`}
      />
    );
  }

  // ── Happy path ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20">
      <div className="max-w-[560px] mx-auto px-4">
        <CheckoutSuccessClient order={order as Order} />
      </div>
    </div>
  );
}