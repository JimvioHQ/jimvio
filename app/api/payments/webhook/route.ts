import { NextResponse } from "next/server";

/** Deprecated payment webhook — no longer used. */
export async function POST() {
  return NextResponse.json(
    { error: "Payment provider integration has been removed." },
    { status: 410 }
  );
}
