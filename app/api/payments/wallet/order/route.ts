import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/require-session";
import { payOrderWithWallet } from "@/lib/payments/pay-order-with-wallet";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RequestSchema = z.object({
  orderId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order payment request." }, { status: 400 });
  }

  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  try {
    const result = await payOrderWithWallet(session.user.id, parsed.data.orderId);
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
      orderId: parsed.data.orderId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({
      error: "We couldn't complete this wallet payment. Please retry or contact support if the order remains pending.",
    }, { status: 500 });
  }
}
