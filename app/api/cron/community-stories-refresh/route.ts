import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { refreshCommunityStories } from "@/lib/community/stories/refresh-community-stories";

export const dynamic = "force-dynamic";

/** Every 6h — idempotent; skips communities that already have active stories. */
export async function GET(req: NextRequest) {
  const authError = assertCronAuthorized(req);
  if (authError) return authError;

  try {
    const result = await refreshCommunityStories();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Story refresh failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
