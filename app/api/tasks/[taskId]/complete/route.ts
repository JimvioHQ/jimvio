import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { joinOrSubmitMission } from "@/lib/community/mission-access";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { proofText?: string; proofUrl?: string };

  try {
    const result = await joinOrSubmitMission({
      userId: user.id,
      missionId: taskId,
      text: body.proofText,
      url: body.proofUrl,
    });
    return NextResponse.json({
      completion: result,
      pointsEarned: result.points_earned ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete task";
    const status =
      message === "Mission not found"
        ? 404
        : /not authorized|no access/i.test(message)
          ? 403
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
