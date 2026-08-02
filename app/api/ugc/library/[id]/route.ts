import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

const MEDIA_TYPES = new Set(["video", "image", "file", "audio"]);
const STATUSES = new Set(["uploaded", "draft", "approved", "rejected", "archived"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.file_url === "string") patch.file_url = body.file_url.trim();
  if (typeof body.thumbnail_url === "string" || body.thumbnail_url === null) {
    patch.thumbnail_url = body.thumbnail_url;
  }
  if (typeof body.media_type === "string") {
    if (!MEDIA_TYPES.has(body.media_type)) {
      return NextResponse.json({ error: "Invalid media_type" }, { status: 400 });
    }
    patch.media_type = body.media_type;
  }
  if (typeof body.status === "string") {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (Array.isArray(body.tags)) {
    patch.tags = body.tags.map((t: unknown) => String(t)).filter(Boolean);
  }
  if (typeof body.mime_type === "string" || body.mime_type === null) patch.mime_type = body.mime_type;
  if (body.file_size != null) patch.file_size = Number(body.file_size);
  if (body.duration_seconds != null) patch.duration_seconds = Number(body.duration_seconds);
  if (body.campaign_id !== undefined) patch.campaign_id = body.campaign_id;
  if (body.submission_id !== undefined) patch.submission_id = body.submission_id;

  const { data, error: uErr } = await db
    .from("ugc_content_library")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { error: dErr } = await db
    .from("ugc_content_library")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
