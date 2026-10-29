import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { rateLimit } from "@/lib/ops/rate-limit";
import {
  checkBioCode,
  issueBioCode,
  requestReview,
  verifyByConnection,
} from "@/lib/identity/social-verification-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/identity/social/verify
 *   { action: "connect", platform: "youtube" | "tiktok" }  — official login
 *   { action: "code" | "check" | "review", id }            — bio code
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const limit = rateLimit(`social-verify:${user.id}`, 20, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { action?: string; platform?: string; id?: string };
  const id = typeof body.id === "string" ? body.id : "";
  let result;
  if (body.action === "connect" && (body.platform === "youtube" || body.platform === "tiktok")) {
    result = await verifyByConnection(user.id, body.platform);
  } else if (body.action === "code" && id) {
    result = await issueBioCode(user.id, id);
  } else if (body.action === "check" && id) {
    result = await checkBioCode(user.id, id);
  } else if (body.action === "review" && id) {
    result = await requestReview(user.id, id);
  } else {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.error, needsConnect: result.needsConnect ?? null }, { status: result.status });
  }
  return NextResponse.json(result);
}
