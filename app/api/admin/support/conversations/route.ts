import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { staffListConversations } from "@/lib/support/conversations";

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const url = new URL(request.url);
  const result = await staffListConversations({
    q: url.searchParams.get("q") ?? undefined,
    filter: url.searchParams.get("filter") ?? undefined,
    assigneeId: auth.user.id,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
