import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Shopify sync is retired.", code: "SHOPIFY_RETIRED" },
    { status: 410 }
  );
}
