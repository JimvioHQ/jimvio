import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHubCourses } from "@/services/community/hub-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const courses = await getHubCourses(user.id, {
    q: sp.get("q"),
    category: sp.get("category"),
    difficulty: sp.get("difficulty"),
    instructorId: sp.get("instructorId"),
    lessonQ: sp.get("lessonQ"),
  });
  return NextResponse.json({ courses });
}
