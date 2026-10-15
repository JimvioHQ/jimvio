import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMissionForViewer, listMissionSubmissions, reviewMissionSubmission } from "@/lib/community/mission-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ missionId: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { missionId } = await ctx.params;
  const mission = await getMissionForViewer(user.id, missionId);
  if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  if (req.nextUrl.searchParams.get("submissions") === "1") {
    try {
      const submissions = await listMissionSubmissions({
        userId: user.id,
        missionId,
        cursor: Number(req.nextUrl.searchParams.get("cursor") ?? 0),
      });
      return NextResponse.json({ mission, ...submissions });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Forbidden" },
        { status: 403 },
      );
    }
  }
  return NextResponse.json({ mission });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ missionId: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { missionId } = await ctx.params;
  const body = await req.json().catch(() => null);
  try {
    const result = await reviewMissionSubmission({
      userId: user.id,
      missionId,
      participantId: String(body?.participantId ?? ""),
      decision: body?.decision,
      feedback: body?.feedback,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Review failed" },
      { status: 400 },
    );
  }
}
