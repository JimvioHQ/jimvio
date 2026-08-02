import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { toResumeEntry } from "@/lib/identity/resolve";
import type { ResumeEntry } from "@/lib/identity/types";

export const dynamic = "force-dynamic";

const ENTRY_TYPES = new Set([
  "experience",
  "industry",
  "brand",
  "campaign",
  "education",
  "certification",
]);

/**
 * GET /api/identity/resume?userId=...
 * Resume entries are public by RLS design (used for creator CVs).
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const { user: viewer } = await requireUser();
  const targetId = userId ?? viewer?.id;
  if (!targetId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("jip_resume_entries")
    .select("*")
    .eq("user_id", targetId)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: ((data ?? []) as ResumeEntry[]).map(toResumeEntry) });
}

/**
 * POST /api/identity/resume
 * Body: { entryType, title, organization?, description?, startedOn?, endedOn?, isCurrent?, sortOrder? }
 */
export async function POST(req: NextRequest) {
  const { user, db: rawDb, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const db = rawDb as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const body = await req.json().catch(() => ({}));
  const entryType = String(body.entryType ?? "").toLowerCase();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!ENTRY_TYPES.has(entryType)) return NextResponse.json({ error: "Invalid entryType" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const payload = {
    user_id: user.id,
    entry_type: entryType,
    title,
    organization: typeof body.organization === "string" ? body.organization : null,
    description: typeof body.description === "string" ? body.description : null,
    started_on: typeof body.startedOn === "string" && body.startedOn ? body.startedOn : null,
    ended_on: typeof body.endedOn === "string" && body.endedOn ? body.endedOn : null,
    is_current: Boolean(body.isCurrent),
    sort_order: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
  };

  const { data, error: insertErr } = await db
    .from("jip_resume_entries")
    .insert(payload)
    .select("*")
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 });
  return NextResponse.json({ entry: toResumeEntry(data as ResumeEntry) }, { status: 201 });
}

/**
 * DELETE /api/identity/resume?id=...
 */
export async function DELETE(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error: deleteErr } = await db
    .from("jip_resume_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
