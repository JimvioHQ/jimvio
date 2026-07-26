import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getUserMembership, isMembershipActive } from "@/services/communityService";
import { canAccessRoom } from "@/services/accessControl";

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
}): Promise<CourseAccessResult> {
  const roomAccess = await canAccessRoom(input.userId, input.roomId);
  if (!roomAccess) {
    return {
      roomAccess: false,
      fullContent: false,
      enrollment: null,
      isStaff: false,
      isFreeCourse: true,
    };
  }

  const staff = await isCourseStaff(input.userId, input.communityId, input.creatorId);
  if (staff) {
    return {
      roomAccess: true,
      fullContent: true,
      enrollment: null,
      isStaff: true,
      isFreeCourse: !input.priceCents || input.priceCents <= 0,
    };
  }

  if (input.archivedAt) {
    return {
      roomAccess: true,
      fullContent: false,
      enrollment: null,
      isStaff: false,
      isFreeCourse: true,
    };
  }

  const isFreeCourse = !input.priceCents || input.priceCents <= 0;
  let enrollment = await getActiveEnrollment(input.courseId, input.userId);

  if (!enrollment && isFreeCourse && input.isPublished) {
    enrollment = await enrollInCourse({
      courseId: input.courseId,
      userId: input.userId,
      source: "free",
    });
  }

  if (!enrollment && !isFreeCourse) {
    // Membership-gated paid community rooms: grant enrollment from active membership.
    const membership = await getUserMembership(input.userId, input.communityId);
    if (isMembershipActive(membership)) {
      enrollment = await enrollInCourse({
        courseId: input.courseId,
        userId: input.userId,
        source: "membership",
      });
    }
  }

  return {
    roomAccess: true,
    fullContent: Boolean(enrollment && enrollment.status === "active"),
    enrollment,
    isStaff: false,
    isFreeCourse,
  };
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
