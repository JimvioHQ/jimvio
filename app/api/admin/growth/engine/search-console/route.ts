import { NextResponse } from "next/server";
import { diagnoseSearchConsole } from "@/lib/growth/engine/search-console-diagnostic";
import { requirePlatformAdmin } from "@/lib/ops/require-platform-admin";

export const dynamic = "force-dynamic";

/** Admin-only Search Analytics read. This route does not run a Growth Engine cycle. */
export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const result = await diagnoseSearchConsole();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
