import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutPendingExperience } from "@/components/checkout/checkout-pending-experience";
import { isPawaPaySandboxEnv } from "@/lib/pawapay/env";
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
  const pawapaySandbox = isPawaPaySandboxEnv();
  const rawCountdown = process.env.NEXT_PUBLIC_PAWAPAY_PENDING_COUNTDOWN_SECONDS?.trim();
  const parsedCountdown = rawCountdown ? parseInt(rawCountdown, 10) : NaN;
  const countdownSeconds =
    Number.isFinite(parsedCountdown) && parsedCountdown >= 60 ? parsedCountdown : 600;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20 px-4">
      <CheckoutPendingExperience
        orderId={orderId}
        orderLabel={label}
        orderRouteId={order.id}
        pawapaySandbox={pawapaySandbox}
        appBase={appBase}
        countdownSeconds={countdownSeconds}
      />
    </div>
  );
}
