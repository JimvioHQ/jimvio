import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { ensureNativeVendorCreditsApplied } from "@/lib/payments/credit-vendors-for-native-order";

export const dynamic = "force-dynamic";

/**
 * POST { orderId } — vendor must have line items on that order.
 * Backfills vendor wallet when payment completed before native credit logic existed.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { orderId?: string };
  try {
    body = (await req.json()) as { orderId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const { data: vendor } = await supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle();
  if (!vendor) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });

  const { data: item } = await supabase
    .from("order_items")
    .select("id")
    .eq("order_id", orderId)
    .eq("vendor_id", vendor.id)
    .maybeSingle();

  if (!item) return NextResponse.json({ error: "No matching order for your store" }, { status: 404 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: ord } = await admin.from("orders").select("pawapay_deposit_id, payment_status").eq("id", orderId).single();
  if (!ord || ord.payment_status !== "completed") {
    return NextResponse.json({ error: "Order is not paid yet" }, { status: 400 });
  }

  const depositId = ord.pawapay_deposit_id as string | null | undefined;

  await ensureNativeVendorCreditsApplied(admin, orderId, {
    providerTransactionId: depositId || orderId,
    paymentProvider: "pawapay",
  });

  return NextResponse.json({ ok: true });
}
