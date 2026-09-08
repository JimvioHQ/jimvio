import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reviewParticipant } from "@/lib/ugc/join-service";
import { logJoinAudit } from "@/lib/ugc/join-audit";
import { requireCampaignPermission } from "@/lib/ugc/enterprise/brand-access";

async function assertVendorAccess(
  userId: string,
  campaignId: string,
  permission: string,
) {
  return requireCampaignPermission(userId, campaignId, permission);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await assertVendorAccess(user.id, id, "campaigns.review");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const status = req.nextUrl.searchParams.get("status");
  let query = access.db
    .from("ugc_campaign_participants")
    .select(
      `
      *,
      influencer:influencers!influencer_id (
        id, display_name, profile_image, total_followers, engagement_rate, is_verified
      )
    `,
    )
    .eq("campaign_id", id)
    .order("joined_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await assertVendorAccess(user.id, id, "campaigns.review");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const db = access.db;

  const body = await req.json();
  const { participantId, action, feedback, participantIds } = body as {
    participantId?: string;
    participantIds?: string[];
    action: "approve" | "reject" | "waitlist" | "invite";
    feedback?: string;
  };

  if (!action) return NextResponse.json({ error: "action required" }, { status: 400 });

  const ids = participantIds?.length ? participantIds : participantId ? [participantId] : [];
  if (ids.length === 0) return NextResponse.json({ error: "participantId required" }, { status: 400 });

  if (action === "invite") {
    for (const pid of ids) {
      await db
        .from("ugc_campaign_participants")
        .update({ status: "invited", invited_by: user.id })
        .eq("id", pid)
        .eq("campaign_id", id);
      await logJoinAudit(db, {
        campaignId: id,
        actorUserId: user.id,
        action: "invite_sent",
        metadata: { participantId: pid },
      });
    }
    return NextResponse.json({ success: true });
  }

  const results = [];
  for (const pid of ids) {
    const result = await reviewParticipant(db, {
      campaignId: id,
      participantId: pid,
      reviewerUserId: user.id,
      action,
      feedback,
    });
    results.push({ participantId: pid, ...result });
  }

  return NextResponse.json({ success: true, results });
}
