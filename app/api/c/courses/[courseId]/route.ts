import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { assertCourseAccess } from "@/lib/community/courses/access";
import { normalizeAccessMode, isCatalogVisible } from "@/lib/community/courses/rules";
import { getUserMembership, isMembershipActive } from "@/services/communityService";
import { communityIsPubliclyDiscoverable } from "@/lib/community/join-policy";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createServiceRoleClient();
  const { data: course, error } = await admin
    .from("community_courses")
    .select(
      "*, communities(name, slug, is_private, visibility, visibility_mode, is_active, archived_at), rooms(slug), profiles!community_courses_creator_id_fkey(full_name, username, avatar_url)"
    )
    .eq("id", courseId)
    .maybeSingle();
  if (error || !course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const preview = req.nextUrl.searchParams.get("preview") === "1";
  const access = user ? await assertCourseAccess({
    userId: user.id,
    roomId: course.room_id,
    courseId: course.id,
    communityId: course.community_id,
    creatorId: course.creator_id,
    priceCents: course.price_cents,
    isPublished: course.is_published,
    archivedAt: course.archived_at,
    accessMode: course.access_mode,
  }) : null;
  const membership = user ? await getUserMembership(user.id, course.community_id) : null;
  const communityVisible =
    Boolean(course.communities && communityIsPubliclyDiscoverable(course.communities)) ||
    Boolean(user && (isMembershipActive(membership) || access?.isStaff || access?.enrollment));
  const visible = communityVisible && isCatalogVisible({
    isPublished: Boolean(course.is_published),
    archived: Boolean(course.archived_at),
    accessMode: normalizeAccessMode(course.access_mode),
    viewerIsMember: Boolean(user && (isMembershipActive(membership) || access?.isStaff)),
  });
  if (!visible && !access?.isStaff && !access?.enrollment && !(preview && access?.isStaff)) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const { data: modules } = await admin
    .from("course_modules")
    .select("id, title, description, sort_order, course_lessons(id, title, duration, sort_order, is_free)")
    .eq("course_id", courseId)
    .order("sort_order");
  const { data: reviews } = await admin
    .from("course_reviews")
    .select("id, rating, body, created_at, profiles(full_name, username)")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(20);
  const ratings = (reviews ?? []).map((row) => Number(row.rating));
  const average = ratings.length
    ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
    : null;

  return NextResponse.json({
    course: {
      id: course.id,
      title: course.title,
      description: course.description,
      difficulty: course.difficulty,
      category: course.category,
      language: course.language,
      access_mode: course.access_mode,
      price_cents: course.price_cents,
      currency: course.currency,
      thumbnail_url: course.thumbnail_url,
      total_modules: modules?.length ?? 0,
      total_lessons: (modules ?? []).reduce(
        (total, module) => total + (module.course_lessons?.length ?? 0),
        0
      ),
      total_duration: (modules ?? []).reduce(
        (total, module) =>
          total +
          (module.course_lessons ?? []).reduce(
            (moduleTotal, lesson) => moduleTotal + Math.max(0, Number(lesson.duration ?? 0)),
            0
          ),
        0
      ),
      certificate_enabled: course.certificate_enabled,
      learning_outcomes: course.learning_outcomes ?? [],
      prerequisites: course.prerequisites ?? [],
      is_published: course.is_published,
      archived_at: course.archived_at,
      community: course.communities,
      instructor: course.profiles,
      room_slug: course.rooms?.slug ?? null,
    },
    modules: modules ?? [],
    access: {
      enrolled: Boolean(access?.enrollment) || Boolean(access?.isStaff),
      fullContent: Boolean(access?.fullContent),
      isStaff: Boolean(access?.isStaff),
    },
    viewerAuthenticated: Boolean(user),
    reviews: reviews ?? [],
    rating: { average, count: ratings.length },
  });
}
