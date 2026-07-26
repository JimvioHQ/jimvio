import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getUserMembership } from "@/services/communityService";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

const COURSE_PATCH_ALLOW = new Set([
  "title",
  "description",
  "thumbnail_url",
  "difficulty",
  "category",
  "tags",
  "trailer_url",
  "certificate_enabled",
  "is_published",
  "published_at",
  "archived_at",
  "price_cents",
  "currency",
  "total_modules",
  "total_lessons",
  "total_duration",
]);

const MODULE_PATCH_ALLOW = new Set([
  "title",
  "description",
  "sort_order",
  "is_free",
]);

const LESSON_PATCH_ALLOW = new Set([
  "title",
  "body",
  "video_url",
  "duration",
  "sort_order",
  "is_free",
  "attachments",
]);

async function assertCourseStaff(roomId: string, userId: string) {
  const admin = createServiceRoleClient();
  const { data: room } = await admin
    .from("rooms")
    .select("community_id, name")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) return { error: "Room not found" as const, status: 404 as const };

  const { data: community } = await admin
    .from("communities")
    .select("owner_id")
    .eq("id", room.community_id)
    .maybeSingle();
  const membership = await getUserMembership(userId, room.community_id);
  const staffRoles = new Set(["owner", "admin", "moderator", "creator"]);
  const isAuthorized =
    community?.owner_id === userId ||
    (membership?.status === "active" && staffRoles.has(membership.role ?? ""));
  if (!isAuthorized) {
    return { error: "Unauthorized" as const, status: 403 as const };
  }
  return { admin, room };
}

async function resolveCourse(
  admin: ReturnType<typeof createServiceRoleClient>,
  roomId: string,
  communityId: string,
  userId: string,
  roomName: string | null
) {
  let { data: course } = await admin
    .from("community_courses")
    .select("id, total_lessons, total_modules")
    .eq("room_id", roomId)
    .maybeSingle();
  if (!course) {
    const { data: newCourse, error: createError } = await admin
      .from("community_courses")
      .insert({
        room_id: roomId,
        community_id: communityId,
        creator_id: userId,
        title: roomName || "New Course",
        is_published: false,
      })
      .select("id, total_lessons, total_modules")
      .single();
    if (createError) throw new Error(createError.message);
    course = newCourse;
  }
  return course;
}

async function refreshCourseCounters(
  admin: ReturnType<typeof createServiceRoleClient>,
  courseId: string
) {
  const [{ count: modules }, { count: lessons }, { data: durationRows }] =
    await Promise.all([
      admin
        .from("course_modules")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId),
      admin
        .from("course_lessons")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId),
      admin.from("course_lessons").select("duration").eq("course_id", courseId),
    ]);
  const totalDuration = (durationRows ?? []).reduce(
    (sum, row) => sum + Number(row.duration ?? 0),
    0
  );
  await admin
    .from("community_courses")
    .update({
      total_modules: modules ?? 0,
      total_lessons: lessons ?? 0,
      total_duration: totalDuration,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId);
}

function pickAllowed(
  updates: Record<string, unknown>,
  allow: Set<string>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (allow.has(key)) out[key] = value;
  }
  return out;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const resData = await req.json();
  const { type, moduleId, title, description, video_url, body, sort_order, duration, is_free } =
    resData;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`course-manage:${user.id}`, 40, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const gate = await assertCourseStaff(roomId, user.id);
  if ("error" in gate && gate.error) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { admin, room } = gate as {
    admin: ReturnType<typeof createServiceRoleClient>;
    room: { community_id: string; name: string | null };
  };

  let course;
  try {
    course = await resolveCourse(admin, roomId, room.community_id, user.id, room.name);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create course" },
      { status: 400 }
    );
  }

  if (type === "module") {
    const { data: m, error } = await admin
      .from("course_modules")
      .insert({
        course_id: course.id,
        title: title || "New Module",
        description: description || null,
        sort_order: sort_order || 0,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await refreshCourseCounters(admin, course.id);
    return NextResponse.json({ module: m });
  }

  if (type === "lesson") {
    if (!moduleId) {
      return NextResponse.json({ error: "Module ID required" }, { status: 400 });
    }
    const { data: mod } = await admin
      .from("course_modules")
      .select("id")
      .eq("id", moduleId)
      .eq("course_id", course.id)
      .maybeSingle();
    if (!mod) return NextResponse.json({ error: "Module not in this course" }, { status: 400 });

    const { data: l, error } = await admin
      .from("course_lessons")
      .insert({
        course_id: course.id,
        module_id: moduleId,
        title: title || "New Lesson",
        body: body || null,
        video_url: video_url || null,
        duration: typeof duration === "number" ? duration : 0,
        sort_order: sort_order || 0,
        is_free: typeof is_free === "boolean" ? is_free : false,
        attachments: { files: [], slideshow: [], media_mode: "video" },
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await refreshCourseCounters(admin, course.id);
    return NextResponse.json({ lesson: l });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const resData = (await req.json()) as Record<string, unknown>;
  const type = resData.type as string | undefined;
  const id = resData.id as string | undefined;
  const action = resData.action as string | undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`course-manage:${user.id}`, 40, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const gate = await assertCourseStaff(roomId, user.id);
  if ("error" in gate && gate.error) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { admin, room } = gate as {
    admin: ReturnType<typeof createServiceRoleClient>;
    room: { community_id: string; name: string | null };
  };

  const course = await resolveCourse(admin, roomId, room.community_id, user.id, room.name);
  const now = new Date().toISOString();

  if (type === "course") {
    const lifecycle: Record<string, unknown> = {};
    if (action === "publish") {
      lifecycle.is_published = true;
      lifecycle.published_at = now;
      lifecycle.archived_at = null;
    } else if (action === "unpublish" || action === "draft") {
      lifecycle.is_published = false;
    } else if (action === "archive") {
      lifecycle.archived_at = now;
      lifecycle.is_published = false;
    } else if (action === "restore") {
      lifecycle.archived_at = null;
    } else if (action === "delete") {
      // Soft-delete via archive + unpublish (preserve progress/enrollments).
      lifecycle.archived_at = now;
      lifecycle.is_published = false;
    }

    const { action: _a, type: _t, id: _i, ...raw } = resData;
    const allowed = pickAllowed(raw, COURSE_PATCH_ALLOW);
    const patch = { ...allowed, ...lifecycle, updated_at: now };

    if (Object.keys(patch).length <= 1) {
      return NextResponse.json({ error: "No valid course updates" }, { status: 400 });
    }

    const { error } = await admin
      .from("community_courses")
      .update(patch)
      .eq("room_id", roomId)
      .eq("id", course.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (type === "module") {
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { type: _t, id: _i, action: _a, ...raw } = resData;
    const allowed = pickAllowed(raw, MODULE_PATCH_ALLOW);
    const { error } = await admin
      .from("course_modules")
      .update(allowed)
      .eq("id", id)
      .eq("course_id", course.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await refreshCourseCounters(admin, course.id);
    return NextResponse.json({ success: true });
  }

  if (type === "lesson") {
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const {
      type: _t,
      id: _i,
      action: _a,
      slideshow,
      media_mode,
      attachments,
      course_id: _courseId,
      module_id: _moduleId,
      ...raw
    } = resData;
    const allowed = pickAllowed(raw, LESSON_PATCH_ALLOW);
    const finalAttachments =
      attachments !== undefined || slideshow !== undefined || media_mode !== undefined
        ? {
            files: Array.isArray(attachments) ? attachments : [],
            slideshow: Array.isArray(slideshow) ? slideshow : [],
            media_mode: typeof media_mode === "string" ? media_mode : "video",
          }
        : undefined;

    const { error } = await admin
      .from("course_lessons")
      .update({
        ...allowed,
        ...(finalAttachments ? { attachments: finalAttachments } : {}),
        updated_at: now,
      })
      .eq("id", id)
      .eq("course_id", course.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await refreshCourseCounters(admin, course.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!type || !id) {
    return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gate = await assertCourseStaff(roomId, user.id);
  if ("error" in gate && gate.error) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { admin, room } = gate as {
    admin: ReturnType<typeof createServiceRoleClient>;
    room: { community_id: string; name: string | null };
  };

  const course = await resolveCourse(admin, roomId, room.community_id, user.id, room.name);

  if (type === "course") {
    const { error } = await admin
      .from("community_courses")
      .update({
        archived_at: new Date().toISOString(),
        is_published: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", course.id)
      .eq("room_id", roomId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, archived: true });
  }

  if (type === "module") {
    const { error } = await admin
      .from("course_modules")
      .delete()
      .eq("id", id)
      .eq("course_id", course.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await refreshCourseCounters(admin, course.id);
    return NextResponse.json({ success: true });
  }

  if (type === "lesson") {
    const { error } = await admin
      .from("course_lessons")
      .delete()
      .eq("id", id)
      .eq("course_id", course.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await refreshCourseCounters(admin, course.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
