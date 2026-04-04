import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getUserMembership } from "@/services/communityService";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const resData = await req.json();
  const { type, moduleId, title, description, video_url, body, sort_order } = resData;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServiceRoleClient();
  const { data: room } = await admin.from("rooms").select("community_id, name").eq("id", roomId).maybeSingle();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const membership = await getUserMembership(user.id, room.community_id);
  const staffRoles = new Set(["owner", "admin"]);
  const isAuthorized = staffRoles.has(membership?.role ?? "");
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  let { data: course } = await admin.from("community_courses").select("id").eq("room_id", roomId).maybeSingle();
  if (!course) {
    const { data: newCourse, error: createError } = await admin.from("community_courses").insert({
      room_id: roomId,
      community_id: room.community_id,
      title: room.name || "New Course",
    }).select("id").single();
    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
    course = newCourse;
  }

  if (type === "module") {
    const { data: m, error } = await admin.from("course_modules").insert({
      course_id: course.id,
      title: title || "New Module",
      description: description || null,
      sort_order: sort_order || 0,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ module: m });
  }

  if (type === "lesson") {
    if (!moduleId) return NextResponse.json({ error: "Module ID required" }, { status: 400 });
    const { data: l, error } = await admin.from("course_lessons").insert({
      course_id: course.id,
      module_id: moduleId,
      title: title || "New Lesson",
      body: body || null,
      video_url: video_url || null,
      sort_order: sort_order || 0,
      attachments: { files: [], slideshow: [], media_mode: "video" }
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ lesson: l });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const resData = await req.json();
  const { type, id, ...updates } = resData;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServiceRoleClient();
  const { data: room } = await admin.from("rooms").select("community_id").eq("id", roomId).maybeSingle();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const membership = await getUserMembership(user.id, room.community_id);
  const staffRoles = new Set(["owner", "admin"]);
  const isAuthorized = staffRoles.has(membership?.role ?? "");
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  if (type === "course") {
    const { error } = await admin.from("community_courses").update(updates).eq("room_id", roomId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (type === "module") {
    const { error } = await admin.from("course_modules").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (type === "lesson") {
    const { slideshow, media_mode, attachments, course_id, module_id, ...restUpdates } = updates;
    const finalAttachments = {
      files: attachments || [],
      slideshow: slideshow || [],
      media_mode: media_mode || "video"
    };

    const { error } = await admin.from("course_lessons").update({ 
      ...restUpdates, 
      attachments: finalAttachments 
    }).eq("id", id);
    
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
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

  if (!type || !id) return NextResponse.json({ error: "Missing type or id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServiceRoleClient();
  const { data: room } = await admin.from("rooms").select("community_id").eq("id", roomId).maybeSingle();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const membership = await getUserMembership(user.id, room.community_id);
  const staffRoles = new Set(["owner", "admin"]);
  if (!staffRoles.has(membership?.role ?? "")) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const table = type === "module" ? "course_modules" : (type === "lesson" ? "course_lessons" : null);
  if (!table) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const { error } = await admin.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
