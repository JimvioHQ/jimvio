import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { checkPostOwnership } from "@/lib/ugc/verification/ownership";

export const dynamic = "force-dynamic";

/** Checks a link before submitting: is the video on the creator's connected account? */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { platform?: string; post_url?: string };
  const platform = String(body.platform ?? "").toLowerCase();
  const url = String(body.post_url ?? "").trim();
  if (!platform || !url) return NextResponse.json({ error: "Pick a platform and paste the link." }, { status: 400 });
  const result = await checkPostOwnership(user.id, platform, url);
  return NextResponse.json({ result });
}
