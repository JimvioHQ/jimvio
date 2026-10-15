import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getUserMembership, isMembershipActive } from "@/services/communityService";
import {
  DEFAULT_BEHAVIOR_CONFIG,
  DEFAULT_PERMISSION_CONFIG,
} from "@/lib/community/owner-console/channels/constants";
import { normalizeAccessMode, serverPriceCents, type CourseAccessMode } from "@/lib/community/courses/rules";

function db() {
  return createServiceRoleClient();
}

const STAFF_ROLES = new Set(["owner", "admin", "moderator", "creator"]);

export async function assertCourseManager(userId: string, communityId: string) {
  const { data: community } = await db()
    .from("communities")
    .select("id, owner_id, slug, name")
    .eq("id", communityId)
    .maybeSingle();
  if (!community) throw new Error("Community not found");
  if (community.owner_id === userId) return community;
  const membership = await getUserMembership(userId, communityId);
  if (
    isMembershipActive(membership) &&
    STAFF_ROLES.has(membership?.role ?? "")
  ) {
    return community;
  }
  throw new Error("Forbidden");
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "course"
  );
}

async function ensureCourseSpace(communityId: string) {
  const { data: existing } = await db()
    .from("spaces")
    .select("id, slug")
    .eq("community_id", communityId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const courses = (existing ?? []).find((space) => space.slug === "courses");
  if (courses) return courses.id;
  if (existing && existing.length > 0) return existing[0].id;

  const { data: created, error } = await db()
    .from("spaces")
    .insert({
      community_id: communityId,
      name: "Courses",
      slug: "courses",
      description: "Community courses",
      access_type: "free",
      is_active: true,
      sort_order: 0,
    })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Could not create course space");
  return created.id;
}

export async function listManagedCourses(communityId: string) {
  const { data, error } = await db()
    .from("community_courses")
    .select(
      "id, title, description, difficulty, category, language, access_mode, price_cents, currency, is_published, published_at, archived_at, thumbnail_url, total_lessons, total_modules, total_duration, certificate_enabled, learning_outcomes, prerequisites, room_id, updated_at, rooms(slug)"
    )
    .eq("community_id", communityId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createDraftCourse(input: {
  userId: string;
  communityId: string;
  title: string;
}) {
  const community = await assertCourseManager(input.userId, input.communityId);
  const title = input.title.trim();
  if (title.length < 3) throw new Error("Title must be at least 3 characters");
  const spaceId = await ensureCourseSpace(input.communityId);
  const slug = `${slugify(title)}-${Date.now().toString(36)}`.slice(0, 80);
  const { data: room, error: roomError } = await db()
    .from("rooms")
    .insert({
      space_id: spaceId,
      community_id: input.communityId,
      name: title,
      slug,
      room_type: "course",
      access_type: "inherit",
      sort_order: 0,
      is_active: true,
      channel_kind: "courses",
      permission_config: {
        ...DEFAULT_PERMISSION_CONFIG,
        whoCanPost: [...DEFAULT_PERMISSION_CONFIG.whoCanPost],
        publisherIds: [],
      },
      behavior_config: {
        ...DEFAULT_BEHAVIOR_CONFIG,
        welcomeMessage: "Course workspace",
      },
    })
    .select("id, slug")
    .single();
  if (roomError || !room) throw new Error(roomError?.message ?? "Could not create course room");

  const { data: course, error } = await db()
    .from("community_courses")
    .insert({
      room_id: room.id,
      community_id: input.communityId,
      creator_id: input.userId,
      title,
      description: null,
      is_published: false,
      access_mode: "members",
      language: "en",
      difficulty: "beginner",
      currency: "USD",
      learning_outcomes: [],
      prerequisites: [],
    })
    .select("*")
    .single();
  if (error || !course) throw new Error(error?.message ?? "Could not create course");
  return { course, communitySlug: community.slug as string, roomSlug: room.slug as string };
}

export async function loadManagedCourse(courseId: string, userId: string) {
  const { data: course, error } = await db()
    .from("community_courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!course) throw new Error("Course not found");
  await assertCourseManager(userId, course.community_id);
  return course;
}

const COURSE_FIELDS = new Set([
  "title",
  "description",
  "thumbnail_url",
  "difficulty",
  "category",
  "tags",
  "trailer_url",
  "certificate_enabled",
  "price_cents",
  "currency",
  "language",
  "learning_outcomes",
  "prerequisites",
  "access_mode",
  "total_duration",
]);

export async function updateCourse(
  userId: string,
  courseId: string,
  patch: Record<string, unknown>
) {
  const course = await loadManagedCourse(courseId, userId);
  const next: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(patch)) {
    if (!COURSE_FIELDS.has(key)) continue;
    next[key] = value;
  }
  if ("title" in next && String(next.title ?? "").trim().length < 3) {
    throw new Error("Title must be at least 3 characters");
  }
  if ("access_mode" in next) next.access_mode = normalizeAccessMode(next.access_mode);
  if ("price_cents" in next) {
    const price = serverPriceCents(next.price_cents);
    next.price_cents = price > 0 ? price : null;
  }
  if ("learning_outcomes" in next && !Array.isArray(next.learning_outcomes)) {
    throw new Error("Learning outcomes must be a list");
  }
  if ("prerequisites" in next && !Array.isArray(next.prerequisites)) {
    throw new Error("Prerequisites must be a list");
  }
  const { data, error } = await db()
    .from("community_courses")
    .update(next)
    .eq("id", course.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function publishCourse(userId: string, courseId: string, publish: boolean) {
  const course = await loadManagedCourse(courseId, userId);
  if (publish) {
    const title = String(course.title ?? "").trim();
    const description = String(course.description ?? "").trim();
    if (title.length < 3) throw new Error("Add a title before publishing");
    if (description.length < 10) throw new Error("Add a description before publishing");
    const { count } = await db()
      .from("course_lessons")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId);
    if (!count) throw new Error("Add at least one lesson before publishing");
  }
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("community_courses")
    .update({
      is_published: publish,
      published_at: publish ? course.published_at ?? now : course.published_at,
      archived_at: publish ? null : course.archived_at,
      updated_at: now,
    })
    .eq("id", courseId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function archiveCourse(userId: string, courseId: string) {
  await loadManagedCourse(courseId, userId);
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("community_courses")
    .update({
      is_published: false,
      archived_at: now,
      updated_at: now,
    })
    .eq("id", courseId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function duplicateCourse(userId: string, courseId: string) {
  const course = await loadManagedCourse(courseId, userId);
  const created = await createDraftCourse({
    userId,
    communityId: course.community_id,
    title: `${course.title} copy`.slice(0, 140),
  });
  await db()
    .from("community_courses")
    .update({
      description: course.description,
      difficulty: course.difficulty,
      category: course.category,
      tags: course.tags,
      language: course.language,
      access_mode: course.access_mode,
      price_cents: course.price_cents,
      currency: course.currency,
      certificate_enabled: course.certificate_enabled,
      learning_outcomes: course.learning_outcomes ?? [],
      prerequisites: course.prerequisites ?? [],
      thumbnail_url: course.thumbnail_url,
      is_published: false,
      archived_at: null,
    })
    .eq("id", created.course.id);

  const { data: modules } = await db()
    .from("course_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order");
  for (const sourceModule of modules ?? []) {
    const { data: copy } = await db()
      .from("course_modules")
      .insert({
        course_id: created.course.id,
        title: sourceModule.title,
        description: sourceModule.description,
        sort_order: sourceModule.sort_order,
        is_free: sourceModule.is_free,
      })
      .select("id")
      .single();
    if (!copy) continue;
    const { data: lessons } = await db()
      .from("course_lessons")
      .select("*")
      .eq("module_id", sourceModule.id);
    for (const lesson of lessons ?? []) {
      const { data: lessonCopy } = await db()
        .from("course_lessons")
        .insert({
          course_id: created.course.id,
          module_id: copy.id,
          title: lesson.title,
          body: lesson.body,
          video_url: lesson.video_url,
          duration: lesson.duration,
          sort_order: lesson.sort_order,
          is_free: lesson.is_free,
          attachments: lesson.attachments,
        })
        .select("id")
        .single();
      if (!lessonCopy) continue;
      const { data: quiz } = await db()
        .from("course_quizzes")
        .select("*")
        .eq("lesson_id", lesson.id)
        .maybeSingle();
      if (quiz) {
        await db().from("course_quizzes").insert({
          course_id: created.course.id,
          lesson_id: lessonCopy.id,
          title: quiz.title,
          questions: quiz.questions,
          pass_score: quiz.pass_score,
        });
      }
    }
  }
  const { data: assignments } = await db()
    .from("course_assignments")
    .select("*")
    .eq("course_id", courseId);
  for (const assignment of assignments ?? []) {
    await db().from("course_assignments").insert({
      course_id: created.course.id,
      title: assignment.title,
      instructions: assignment.instructions,
      required: assignment.required,
      pass_score: assignment.pass_score,
    });
  }
  return created.course.id as string;
}

export async function courseRoster(userId: string, courseId: string) {
  await loadManagedCourse(courseId, userId);
  const [{ data: enrollments }, { data: lessons }, { data: progress }, { data: submissions }] =
    await Promise.all([
      db()
        .from("course_enrollments")
        .select("id, user_id, status, source, amount_cents, currency, enrolled_at, profiles(full_name, username)")
        .eq("course_id", courseId)
        .order("enrolled_at", { ascending: false }),
      db().from("course_lessons").select("id").eq("course_id", courseId),
      db()
        .from("lesson_progress")
        .select("user_id, is_completed")
        .eq("course_id", courseId),
      db()
        .from("course_assignment_submissions")
        .select("id, assignment_id, user_id, body, status, score, feedback, submitted_at")
        .eq("course_id", courseId),
    ]);
  const lessonCount = lessons?.length ?? 0;
  return {
    lessonCount,
    enrollments: (enrollments ?? []).map((row) => {
      const completed = (progress ?? []).filter(
        (item) => item.user_id === row.user_id && item.is_completed
      ).length;
      const percent = lessonCount ? Math.round((completed / lessonCount) * 100) : 0;
      return { ...row, progress: Math.min(percent, 100), completed };
    }),
    submissions: submissions ?? [],
  };
}

export async function inviteLearner(input: {
  actorId: string;
  courseId: string;
  userId: string;
}) {
  await loadManagedCourse(input.courseId, input.actorId);
  const { enrollInCourse } = await import("@/lib/community/courses/access");
  return enrollInCourse({
    courseId: input.courseId,
    userId: input.userId,
    source: "manual",
  });
}

export type { CourseAccessMode };
