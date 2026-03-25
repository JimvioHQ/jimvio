import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardPoints } from "@/services/communityService";
import { canAccessRoom } from "@/services/accessControl";

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

  const { proofText, proofUrl } = (await req.json()) as { proofText?: string; proofUrl?: string };

  const { data: task } = await supabase
    .from("community_tasks")
    .select("community_id, points, title, room_id")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const hasAccess = await canAccessRoom(user.id, task.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { data: existing } = await supabase
    .from("task_completions")
    .select("id, status")
    .eq("task_id", taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Already submitted", status: existing.status },
      { status: 400 }
    );
  }

  const points = task.points ?? 0;

  const { data, error } = await supabase
    .from("task_completions")
    .insert({
      task_id: taskId,
      user_id: user.id,
      proof_text: proofText ?? null,
      proof_url: proofUrl ?? null,
      status: "submitted",
      points_earned: points,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await awardPoints(user.id, task.community_id, points);

  return NextResponse.json({ completion: data, pointsEarned: points });
}
