import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/ops/require-platform-admin";
import { createCampaign, createInviteCode, getGrowthStats, listCampaigns, listInvites } from "@/services/ops/growth";
import { writeAuditEvent } from "@/services/ops/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const [campaigns, invites, stats] = await Promise.all([listCampaigns(), listInvites(), getGrowthStats()]);
  return NextResponse.json({ campaigns, invites, stats: { affiliateClicks7d: stats.affiliateClicks7d } });
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json();
  if (body.type === "invite") {
    const invite = await createInviteCode({ inviterId: auth.user.id, campaignId: body.campaignId, inviteeEmail: body.inviteeEmail, expiresAt: body.expiresAt });
    await writeAuditEvent({ actorId: auth.user.id, action: "growth.invite_created", entityType: "growth_invites", entityId: invite.id });
    return NextResponse.json(invite, { status: 201 });
  }
  if (!body.name || !body.slug || !body.channel) return NextResponse.json({ error: "name, slug and channel are required" }, { status: 400 });
  const campaign = await createCampaign({ ...body, createdBy: auth.user.id });
  await writeAuditEvent({ actorId: auth.user.id, action: "growth.campaign_created", entityType: "growth_campaigns", entityId: campaign.id });
  return NextResponse.json(campaign, { status: 201 });
}
