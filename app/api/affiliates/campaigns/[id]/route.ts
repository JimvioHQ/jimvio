import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCampaignAnalytics, setCampaignStatus } from "@/lib/affiliate/campaigns";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const analytics = await getCampaignAnalytics(id);
    if (analytics.campaign.created_by !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(analytics);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Not found" },
      { status: 404 }
    );
  }
}

/** PATCH — pause | resume | archive campaign */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "";
  const map: Record<string, "active" | "paused" | "archived"> = {
    resume: "active",
    pause: "paused",
    archive: "archived",
    activate: "active",
  };
  const status = map[action];
  if (!status) {
    return NextResponse.json(
      { error: "action must be pause | resume | activate | archive" },
      { status: 400 }
    );
  }

  try {
    const campaign = await setCampaignStatus(id, user.id, status);
    return NextResponse.json({ ok: true, campaign });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 }
    );
  }
}
