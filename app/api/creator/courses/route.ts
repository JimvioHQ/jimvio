import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { studentDashboard, upsertLesson, upsertModule } from "@/services/creator-economy/courses";

export const dynamic = "force-dynamic";
async function currentUser() { const supabase = await createClient(); return (await supabase.auth.getUser()).data.user; }
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ courses: await studentDashboard(user.id) });
}
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (body.action === "module") return NextResponse.json({ module: await upsertModule({ ...body, userId: user.id }) });
    if (body.action === "lesson") return NextResponse.json({ lesson: await upsertLesson({ ...body, userId: user.id }) });
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 }); }
}
