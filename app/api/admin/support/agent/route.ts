import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { parseSupportRole } from "@/lib/support/agent-identity";
import { readAgentProfile, saveAgentProfile } from "@/lib/support/conversations";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const result = await readAgentProfile(auth.user.id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  const result = await saveAgentProfile({
    userId: auth.user.id,
    displayName: typeof body?.displayName === "string" ? body.displayName : "",
    supportRole: parseSupportRole(body?.supportRole),
    active: body?.active !== false,
    eligible: body?.eligible !== false,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
