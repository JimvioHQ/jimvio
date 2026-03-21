import { NextResponse } from "next/server";

/** Deprecated: cart checkout initialization. */
export async function POST() {
  return NextResponse.json(
    { error: "This payment method is no longer available." },
    { status: 501 }
  );
}
