import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reorderFromOrder } from "@/lib/orders/reorder";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await reorderFromOrder(orderId, user.id);
    return NextResponse.json({
      success: true,
      cartUrl: result.cartUrl,
      cartId: result.cartUrl,
      added: result.added,
      skipped: result.skipped,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to reorder";
    const status = message === "Order not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
