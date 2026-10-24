import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { courseCreationHref } from "@/lib/community/courses/create-entry";
import { listManageableCommunities } from "@/lib/community/owner-console/access";
import { logCommunityFailure, publicErrorMessage } from "@/lib/community/public-error";
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
  try {
    const [courses, manageable] = await Promise.all([
      getHubCourses(user.id, {
        q: sp.get("q"),
        category: sp.get("category"),
        difficulty: sp.get("difficulty"),
        instructorId: sp.get("instructorId"),
        lessonQ: sp.get("lessonQ"),
      }),
      listManageableCommunities(supabase, user.id),
    ]);
    return NextResponse.json({
      courses,
      createHref: courseCreationHref(manageable),
    });
  } catch (error) {
    logCommunityFailure("courses.get", error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Could not load courses") },
      { status: 500 },
    );
  }
}
