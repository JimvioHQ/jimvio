import { NextResponse } from "next/server";

/** Deprecated: single-order payment initialization. */
export async function POST() {
  return NextResponse.json(
    { error: "This payment method is no longer available." },
    { status: 501 }
  );
}
