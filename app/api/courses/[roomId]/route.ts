import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { canAccessRoom } from "@/services/accessControl";
import { getUserMembership } from "@/services/communityService";

export const dynamic = "force-dynamic";

const COURSE_SELECT = `
  *,
  course_modules (
    id,
    title,
    description,
    sort_order,
    is_free,
    created_at,
    course_lessons (
      id,
      module_id,
      course_id,
      title,
      body,
      video_url,
      duration,
      sort_order,
      is_free,
      attachments,
      created_at,
      updated_at
    )
  )
`;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await canAccessRoom(user.id, roomId);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { data: course, error } = await supabase
    .from("community_courses")
    .select(COURSE_SELECT)
    .eq("room_id", roomId)
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (course) {
    return NextResponse.json({ course });
  }

  // No community_courses row yet: course rooms are often created without a linked course record.
  const admin = createServiceRoleClient();
  const { data: room } = await admin.from("rooms").select("id, name, community_id, room_type").eq("id", roomId).maybeSingle();

  if (!room || room.room_type !== "course") {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const { data: community } = await admin.from("communities").select("owner_id").eq("id", room.community_id).maybeSingle();
  const membership = await getUserMembership(user.id, room.community_id);
  const staffRoles = new Set(["owner", "admin", "moderator"]);
  const canSeedCourse =
    community?.owner_id === user.id ||
    (membership?.status === "active" && staffRoles.has(membership.role ?? ""));

  if (canSeedCourse) {
    const { data: existing } = await admin.from("community_courses").select("id").eq("room_id", roomId).limit(1).maybeSingle();
    if (!existing) {
      const { error: insertErr } = await admin.from("community_courses").insert({
        room_id: room.id,
        community_id: room.community_id,
        creator_id: community?.owner_id ?? user.id,
        title: room.name?.trim() || "Course",
        description: null,
      });
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    const { data: seeded, error: fetchErr } = await admin
      .from("community_courses")
      .select(COURSE_SELECT)
      .eq("room_id", roomId)
      .limit(1)
      .maybeSingle();

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 });
    if (seeded) return NextResponse.json({ course: seeded });
  }

  // Member can open the room but no course has been set up yet — avoid 404 noise in devtools.
  return NextResponse.json({ course: null });
}
