import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/require-session";
import { payOrderWithWallet, payOrdersWithWallet } from "@/lib/payments/pay-order-with-wallet";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RequestSchema = z.object({
  orderId: z.string().uuid().optional(),
  orderIds: z.array(z.string().uuid()).min(1).max(50).optional(),
}).refine((value) => Boolean(value.orderId || value.orderIds?.length), {
  message: "At least one order ID is required.",
});

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order payment request." }, { status: 400 });
  }

  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  try {
    const orderIds = parsed.data.orderIds?.length
      ? [...new Set(parsed.data.orderIds)]
      : parsed.data.orderId
        ? [parsed.data.orderId]
        : [];

    if (!orderIds.length || orderIds.length !== (parsed.data.orderIds?.length ?? orderIds.length)) {
      return NextResponse.json({ error: "Invalid order payment request." }, { status: 400 });
    }

    const result = orderIds.length > 1
      ? await payOrdersWithWallet(session.user.id, orderIds)
      : await payOrderWithWallet(session.user.id, orderIds[0]);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...(result.code ? { code: result.code } : {}) },
        { status: result.status },
      );
    }

    return NextResponse.json({
      success: true,
      alreadyPaid: result.alreadyPaid,
      redirectUrl: result.redirectUrl,
    });
  } catch (error) {
    console.error("[wallet-order-payment] failed", {
      orderCount: parsed.data.orderIds?.length ?? (parsed.data.orderId ? 1 : 0),
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({
      error: "We couldn't complete this wallet payment. Please retry or contact support if the order remains pending.",
    }, { status: 500 });
  }
}
