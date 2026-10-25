import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/ops/require-platform-admin";
import { applyEngineAction, engineSnapshot, loadEngine } from "@/services/growth/engine-control";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const loaded = await loadEngine();
  return NextResponse.json(engineSnapshot(loaded));
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Expected an action object." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Expected an action object." }, { status: 400 });
  }

  const result = await applyEngineAction(auth.user.id, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ snapshot: result.snapshot, summary: "summary" in result ? result.summary : null });
}
