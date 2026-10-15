import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertCourseManager, createDraftCourse, listManagedCourses } from "@/lib/community/courses/manage";
import { getCourseAnalytics } from "@/lib/community/courses/analytics";

export const dynamic = "force-dynamic";

async function userId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET(req: NextRequest) {
  const user = await userId();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const communityId = req.nextUrl.searchParams.get("communityId")?.trim();
  if (!communityId) return NextResponse.json({ error: "communityId required" }, { status: 400 });
  try {
    await assertCourseManager(user, communityId);
    const [courses, analytics] = await Promise.all([
      listManagedCourses(communityId),
      getCourseAnalytics({ communityId }),
    ]);
    return NextResponse.json({ courses, analytics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  const user = await userId();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as { communityId?: string; title?: string };
    if (!body.communityId || !body.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const created = await createDraftCourse({
      userId: user,
      communityId: body.communityId,
      title: body.title,
    });
    return NextResponse.json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create course";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
