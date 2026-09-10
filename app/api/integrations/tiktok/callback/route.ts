import { NextResponse } from "next/server";
import { resolveAppOrigin } from "@/lib/live/destinations/oauth-state";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origin = resolveAppOrigin(req);
  return NextResponse.redirect(
    `${origin}/communities/live?dest_error=${encodeURIComponent(
      "TikTok Live is not currently enabled for this Jimvio integration."
    )}`
  );
}
