import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Shopify OAuth callback — retired. */
export async function GET() {
  return NextResponse.json(
    {
      error: "Shopify OAuth is retired. Use a native Jimvio store.",
      code: "SHOPIFY_RETIRED",
    },
    { status: 410 }
  );
}
