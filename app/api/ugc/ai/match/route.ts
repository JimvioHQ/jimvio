import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { matchCampaignsForCreator } from "@/lib/ugc/platform/matching";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const limit = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 12)));
  const matches = await matchCampaignsForCreator(db, user.id, limit);
  return NextResponse.json({ data: matches });
}
