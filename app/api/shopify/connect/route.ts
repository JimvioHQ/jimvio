import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Legacy Admin API Shopify connect — retired from active product. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Shopify connect is retired. Use a native Jimvio store for catalog and checkout.",
      code: "SHOPIFY_RETIRED",
    },
    { status: 410 }
  );
}
