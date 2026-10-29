import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCampaignPermission } from "@/lib/ugc/enterprise/brand-access";

export const dynamic = "force-dynamic";

/** Owner picks: review every post by hand, or let the Jimvio checker approve clean posts. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await requireCampaignPermission(user.id, id, "campaigns.review");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = (await req.json().catch(() => ({}))) as { mode?: string };
  if (body.mode !== "manual" && body.mode !== "auto") {
    return NextResponse.json({ error: "Choose manual or auto." }, { status: 400 });
  }
  const { error } = await (access.db as unknown as { from: (t: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
    .from("ugc_campaigns")
    .update({ review_mode: body.mode, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  return NextResponse.json({ ok: true, mode: body.mode });
}
