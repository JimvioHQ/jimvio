import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestSecureDownload } from "@/services/creator-economy/digital-products";

export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { productId } = await req.json();
    if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });
    const download = await requestSecureDownload({
      userId: user.id, productId,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: req.headers.get("user-agent"),
      origin: req.nextUrl.origin,
    });
    return NextResponse.json({ download });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Download unavailable" }, { status: 403 });
  }
}
