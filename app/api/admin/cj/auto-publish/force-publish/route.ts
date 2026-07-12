import { NextResponse } from "next/server";
import { forcePublishAdminProduct } from "@/lib/actions/auto-publish";

export async function POST(req: Request) {
  let body: { productId?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.productId || !body.reason?.trim()) {
    return NextResponse.json(
      { success: false, error: "productId and reason are required" },
      { status: 400 }
    );
  }

  const result = await forcePublishAdminProduct(body.productId, body.reason);
  if (!result.success) {
    return NextResponse.json(result, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
