import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { heartbeatAgent } from "@/lib/support/conversations";

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  const available = body?.available !== false;
  const result = await heartbeatAgent(auth.user.id, available);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
