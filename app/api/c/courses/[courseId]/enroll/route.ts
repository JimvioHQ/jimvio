import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrollIfEligible } from "@/lib/community/courses/access";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { courseId } = await params;
  try {
    const enrollment = await enrollIfEligible({ userId: user.id, courseId });
    return NextResponse.json({ enrollment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not enroll";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
