import { NextRequest, NextResponse } from "next/server";
import { getPaymentStatus } from "@/services/nowpayments";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;
    const id = parseInt(paymentId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid payment ID" }, { status: 400 });
    }

    const status = await getPaymentStatus(id);
    return NextResponse.json(status);
  } catch (error: any) {
    console.error("NowPayments status error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to get payment status" },
      { status: 500 }
    );
  }
}
