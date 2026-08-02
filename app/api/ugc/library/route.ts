import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

const MEDIA_TYPES = new Set(["video", "image", "file", "audio"]);
const STATUSES = new Set(["uploaded", "draft", "approved", "rejected", "archived"]);

export async function GET(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const status = sp.get("status")?.trim();
  const mediaType = sp.get("media_type")?.trim();
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.min(50, Number(sp.get("limit") ?? 24));
  const offset = (page - 1) * limit;

  let query = db
    .from("ugc_content_library")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && STATUSES.has(status)) query = query.eq("status", status);
  if (mediaType && MEDIA_TYPES.has(mediaType)) query = query.eq("media_type", mediaType);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, (c) => `\\${c}`)}%`);

  const { data, count, error: qErr } = await query;
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
}

export async function POST(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const { influencer } = await requireInfluencer(user.id);

  const body = await req.json();
  const fileUrl = String(body.file_url ?? "").trim();
  if (!fileUrl) return NextResponse.json({ error: "file_url is required" }, { status: 400 });

  const mediaType = String(body.media_type ?? "video");
  if (!MEDIA_TYPES.has(mediaType)) {
    return NextResponse.json({ error: "Invalid media_type" }, { status: 400 });
  }

  const status = String(body.status ?? "uploaded");
  if (!STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.map((t: unknown) => String(t)).filter(Boolean)
    : [];

  const { data, error: insErr } = await db
    .from("ugc_content_library")
    .insert({
      user_id: user.id,
      influencer_id: influencer?.id ?? null,
      title: typeof body.title === "string" ? body.title.trim() : null,
      file_url: fileUrl,
      thumbnail_url: typeof body.thumbnail_url === "string" ? body.thumbnail_url : null,
      media_type: mediaType,
      status,
      campaign_id: body.campaign_id ?? null,
      submission_id: body.submission_id ?? null,
      tags,
      mime_type: typeof body.mime_type === "string" ? body.mime_type : null,
      file_size: body.file_size != null ? Number(body.file_size) : null,
      duration_seconds: body.duration_seconds != null ? Number(body.duration_seconds) : null,
    })
    .select("*")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
