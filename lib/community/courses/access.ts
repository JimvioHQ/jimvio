import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getUserMembership, isMembershipActive } from "@/services/communityService";
import { canAccessRoom } from "@/services/accessControl";
import {
  canAutoEnrollFree,
  normalizeAccessMode,
  retainsLearningAccess,
} from "@/lib/community/courses/rules";

function db() {
  return createServiceRoleClient();
}

export type EnrollmentStatus = "active" | "revoked" | "refunded" | "expired";
export type EnrollmentSource = "free" | "membership" | "purchase" | "manual" | "staff";

export type CourseEnrollmentRow = {
  id: string;
  course_id: string;
  user_id: string;
  status: EnrollmentStatus;
  source: EnrollmentSource;
  order_id?: string | null;
  amount_cents?: number | null;
  currency?: string | null;
  enrolled_at: string;
  revoked_at?: string | null;
};

export type CourseAccessResult = {
  roomAccess: boolean;
  fullContent: boolean;
  enrollment: CourseEnrollmentRow | null;
  isStaff: boolean;
  isFreeCourse: boolean;
};

async function isCourseStaff(userId: string, communityId: string, creatorId: string) {
  if (creatorId === userId) return true;
  const { data: community } = await db()
    .from("communities")
    .select("owner_id")
    .eq("id", communityId)
    .maybeSingle();
  if (community?.owner_id === userId) return true;
  const membership = await getUserMembership(userId, communityId);
  if (!isMembershipActive(membership)) return false;
  return ["owner", "admin", "moderator", "creator"].includes(membership?.role ?? "");
}

export async function getActiveEnrollment(
  courseId: string,
  userId: string
): Promise<CourseEnrollmentRow | null> {
  const { data } = await db()
    .from("course_enrollments")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return (data as CourseEnrollmentRow | null) ?? null;
}

export async function enrollInCourse(input: {
  courseId: string;
  userId: string;
  source: EnrollmentSource;
  orderId?: string | null;
  amountCents?: number | null;
  currency?: string | null;
}): Promise<CourseEnrollmentRow> {
  const existing = await getActiveEnrollment(input.courseId, input.userId);
  if (existing && (existing.source === "purchase" || input.source !== "purchase")) {
    if (existing.source === "purchase" || input.source === existing.source) return existing;
  }
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("course_enrollments")
    .upsert(
      {
        course_id: input.courseId,
        user_id: input.userId,
        status: "active",
        source: input.source,
        order_id: input.orderId ?? null,
        amount_cents: input.amountCents ?? null,
        currency: input.currency ?? null,
        enrolled_at: now,
        revoked_at: null,
        updated_at: now,
      },
      { onConflict: "course_id,user_id" }
    )
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Enrollment failed");

  // Non-order purchase path: record affiliate attribution hook
  if (input.source === "purchase" && !input.orderId && Number(input.amountCents ?? 0) > 0) {
    try {
      const { attributeCourseEnrollment } = await import("@/lib/affiliate/surfaces");
      await attributeCourseEnrollment({
        buyerUserId: input.userId,
        courseId: input.courseId,
        enrollmentId: data.id,
        amount: Number(input.amountCents) / 100,
        currency: input.currency ?? "USD",
      });
    } catch (err) {
      console.warn("[enrollInCourse] affiliate attribution skipped:", err);
    }
  }

  try {
    const { data: course } = await db()
      .from("community_courses")
      .select("title")
      .eq("id", input.courseId)
      .maybeSingle();
    const { notifyCourseEnrollment } = await import("@/lib/notifications/publishers");
    await notifyCourseEnrollment({
      userId: input.userId,
      courseId: input.courseId,
      courseTitle: (course as { title?: string } | null)?.title ?? "your course",
    });
  } catch (err) {
    console.warn("[enrollInCourse] notification skipped:", err);
  }

  return data as CourseEnrollmentRow;
}

/** Refund / revoke access without deleting history. */
export async function revokeEnrollment(
  courseId: string,
  userId: string,
  status: "revoked" | "refunded" | "expired" = "refunded"
): Promise<void> {
  await db()
    .from("course_enrollments")
    .update({
      status,
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("course_id", courseId)
    .eq("user_id", userId);
}

export async function listPurchaseHistory(userId: string, limit = 50) {
  const { data } = await db()
    .from("course_enrollments")
    .select(
      "*, community_courses(id, title, thumbnail_url, community_id, price_cents, currency)"
    )
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Resolve whether the user may enter the room and unlock full lesson media.
 * Free courses / free lessons remain previewable; paid content requires active enrollment.
 */
export async function assertCourseAccess(input: {
  userId: string;
  roomId: string;
  courseId: string;
  communityId: string;
  creatorId: string;
  priceCents: number | null | undefined;
  isPublished: boolean | null | undefined;
  archivedAt: string | null | undefined;
  accessMode?: string | null;
}): Promise<CourseAccessResult> {
  const isFreeCourse = !input.priceCents || input.priceCents <= 0;
  const roomAccess = input.roomId
    ? await canAccessRoom(input.userId, input.roomId)
    : false;

  const staff = await isCourseStaff(input.userId, input.communityId, input.creatorId);
  if (staff) {
    return {
      roomAccess: true,
      fullContent: true,
      enrollment: null,
      isStaff: true,
      isFreeCourse,
    };
  }

  const enrollment = await getActiveEnrollment(input.courseId, input.userId);
  if (enrollment && retainsLearningAccess(true)) {
    return {
      roomAccess: roomAccess || true,
      fullContent: true,
      enrollment,
      isStaff: false,
      isFreeCourse,
    };
  }

  return {
    roomAccess,
    fullContent: Boolean(enrollment && enrollment.status === "active"),
    enrollment,
    isStaff: false,
    isFreeCourse,
  };
}

export async function enrollIfEligible(input: {
  userId: string;
  courseId: string;
}): Promise<CourseEnrollmentRow> {
  const { data: course, error } = await db()
    .from("community_courses")
    .select(
      "id, community_id, creator_id, price_cents, is_published, archived_at, access_mode, room_id"
    )
    .eq("id", input.courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!course) throw new Error("Course not found");
  if (course.creator_id === input.userId) {
    throw new Error("Creators already have access");
  }
  const existing = await getActiveEnrollment(input.courseId, input.userId);
  if (existing) return existing;

  const price = Number(course.price_cents ?? 0);
  if (price > 0) throw new Error("This course requires payment");
  if (!course.is_published || course.archived_at) throw new Error("Course is not open for enrollment");

  const accessMode = normalizeAccessMode(course.access_mode);
  const membership = await getUserMembership(input.userId, course.community_id);
  const roomAccess = course.room_id
    ? await canAccessRoom(input.userId, course.room_id)
    : false;
  const isMember = isMembershipActive(membership) || roomAccess;
  if (
    !canAutoEnrollFree({
      isPublished: true,
      archived: false,
      accessMode,
      isFree: true,
      isMember,
    })
  ) {
    throw new Error("You cannot enroll in this course");
  }
  return enrollInCourse({
    courseId: input.courseId,
    userId: input.userId,
    source: accessMode === "members" ? "membership" : "free",
  });
}

/** Strip locked lesson media for clients without full enrollment. */
export function redactCourseTreeForAccess<T extends Record<string, unknown>>(
  course: T,
  fullContent: boolean
): T {
  if (fullContent) return course;
  const modules = (course as { course_modules?: Array<Record<string, unknown>> }).course_modules;
  if (!Array.isArray(modules)) return course;

  const nextModules = modules.map((mod) => {
    const lessons = (mod.course_lessons as Array<Record<string, unknown>> | undefined) ?? [];
    return {
      ...mod,
      course_lessons: lessons.map((lesson) => {
        const isFree = Boolean(lesson.is_free);
        if (isFree) return lesson;
        return {
          ...lesson,
          body: null,
          video_url: null,
          attachments: { files: [], slideshow: [], media_mode: "locked" },
          locked: true,
        };
      }),
    };
  });

  return { ...course, course_modules: nextModules };
}
