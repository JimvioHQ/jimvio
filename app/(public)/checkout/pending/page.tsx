import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutPendingRefresh } from "@/components/checkout/checkout-pending-refresh";
import { Smartphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CheckoutPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  if (!orderId) redirect("/checkout");

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, payment_status, payment_provider, total_amount, currency")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20 px-4 text-center">
        <p className="text-[var(--color-text-secondary)]">Order not found.</p>
        <Button asChild className="mt-4">
          <Link href="/cart">Back to cart</Link>
        </Button>
      </div>
    );
  }

  if (order.payment_status === "completed") {
    redirect(`/checkout/success?orderId=${encodeURIComponent(orderId)}`);
  }

  const label = order.order_number?.startsWith("JV")
    ? order.order_number
    : `JV-${String(order.order_number || order.id).slice(0, 8).toUpperCase()}`;

  const appBase = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") || "https://your-site.example";

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20 px-4">
      <CheckoutPendingRefresh orderId={orderId} />
      <div className="max-w-lg mx-auto text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent-light)]">
          <Smartphone className="h-10 w-10 text-[var(--color-accent)]" />
        </div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]">Complete payment on your phone</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          We sent a mobile money request for order <span className="font-bold text-[var(--color-text-primary)]">#{label}</span>.
          Approve it in your wallet app. This page will move to the success screen when payment is confirmed.
        </p>
        <p className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3 text-left text-xs text-[var(--color-text-muted)] leading-relaxed">
          <span className="font-semibold text-[var(--color-text-primary)]">Local dev:</span> PawaPay cannot send webhooks to
          localhost, so we poll their API instead. In production, set your dashboard callback to{" "}
          <code className="break-all text-[10px]">{`${appBase}/api/payments/pawapay/callback`}</code>.{" "}
          <span className="font-semibold text-[var(--color-text-primary)]">Sandbox vs live:</span> use the{" "}
          <span className="whitespace-nowrap">sandbox dashboard</span> and <code className="text-[10px]">PAWAPAY_ENV=sandbox</code>{" "}
          together — deposits only appear in the matching environment.
        </p>
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting for confirmation…
        </div>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href={`/orders/${order.id}`}>View order status</Link>
          </Button>
          <Button asChild>
            <Link href="/products">Continue shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
