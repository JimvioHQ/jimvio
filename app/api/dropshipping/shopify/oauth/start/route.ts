import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Shopify OAuth is retired from active Jimvio Commerce.
 * Historical merchant_stores / credentials rows are retained; new connections are blocked.
 */
export async function GET() {
  return NextResponse.json(
    {
      error:
        "Shopify connection is no longer available. Jimvio Commerce uses native Jimvio stores.",
      code: "SHOPIFY_RETIRED",
    },
    { status: 410 }
  );
}
