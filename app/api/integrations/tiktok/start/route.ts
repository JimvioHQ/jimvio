import { NextResponse } from "next/server";
import { platformReadiness } from "@/lib/live/destinations/capabilities";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = platformReadiness("tiktok");
  return NextResponse.json(
    {
      error:
        readiness.message ??
        "TikTok Live is not currently enabled for this Jimvio integration.",
      status: "requires_approval",
    },
    { status: 403 }
  );
}
