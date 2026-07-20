import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProgress, issueCertificate, listCourseTree, saveQuiz, submitQuiz } from "@/services/creator-economy/courses";

export const dynamic = "force-dynamic";
async function user() { const supabase = await createClient(); return (await supabase.auth.getUser()).data.user; }
export async function GET(_req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const current = await user();
  const { courseId } = await params;
  try { return NextResponse.json({ course: await listCourseTree(courseId, current?.id), progress: current ? await getProgress(courseId, current.id) : null }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Not found" }, { status: 404 }); }
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const current = await user();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { courseId } = await params;
  try {
    const body = await req.json();
    if (body.action === "quiz") return NextResponse.json({ quiz: await saveQuiz({ ...body, userId: current.id, courseId }) });
    if (body.action === "submit_quiz") return NextResponse.json({ attempt: await submitQuiz({ userId: current.id, quizId: body.quizId, answers: body.answers ?? [] }) });
    if (body.action === "certificate") return NextResponse.json({ certificate: await issueCertificate(courseId, current.id) });
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 }); }
}
