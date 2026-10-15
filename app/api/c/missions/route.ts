import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { joinOrSubmitMission, listMissions, saveMission } from "@/lib/community/mission-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await listMissions({
      userId: user.id,
      filter: req.nextUrl.searchParams.get("filter") ?? undefined,
      q: req.nextUrl.searchParams.get("q") ?? undefined,
      category: req.nextUrl.searchParams.get("category") ?? undefined,
      cursor: Number(req.nextUrl.searchParams.get("cursor") ?? 0),
      communityId: req.nextUrl.searchParams.get("communityId") ?? undefined,
      manage: req.nextUrl.searchParams.get("manage") === "1",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load missions" },
      { status: 400 },
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    if (body.action === "submit") {
      const submission = await joinOrSubmitMission({
        userId: user.id,
        missionId: String(body.missionId ?? ""),
        text: body.text,
        url: body.url,
      });
      return NextResponse.json({ ok: true, submission });
    }
    const mission = await saveMission({
      userId: user.id,
      communityId: String(body.communityId ?? ""),
      missionId: body.missionId ? String(body.missionId) : null,
      draft: body,
    });
    return NextResponse.json({ ok: true, mission });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save mission" },
      { status: 400 },
    );
  }
}
