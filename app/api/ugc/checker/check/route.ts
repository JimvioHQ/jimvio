import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { rateLimit } from "@/lib/ops/rate-limit";
import { checkLink } from "@/lib/ugc/checker/check-link";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Jimvio checker: real vs bot signals and AI/quality read for one video link. */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const limit = rateLimit(`ugc-checker:${user.id}`, 15, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "You've run many checks. Try again in an hour." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { url?: unknown };
  const url = typeof body.url === "string" ? body.url.trim().slice(0, 500) : "";
  if (!url) return NextResponse.json({ error: "Paste a video link." }, { status: 400 });
  const result = await checkLink(url, user.id);
  return NextResponse.json({ result });
}
