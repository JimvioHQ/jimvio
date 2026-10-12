import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";
import { optionalBrandWorkspace, brandIdFromRequest } from "@/lib/ugc/enterprise/brand-access";
import { requireBrandPermission } from "@/lib/ugc/enterprise/permissions";
import { recordUgcActivity } from "@/lib/ugc/platform/activity";
import { notifyUser } from "@/lib/notifications/notify-user";

export const dynamic = "force-dynamic";

const CREATOR_STATUSES = new Set(["accepted", "declined"]);
const BRAND_STATUSES = new Set(["cancelled"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json();
  const status = String(body.status ?? "").trim();
  if (!["accepted", "declined", "cancelled"].includes(status)) {
    return NextResponse.json(
      { error: "status must be accepted, declined, or cancelled" },
      { status: 400 }
    );
  }

  const brandWs = await optionalBrandWorkspace(user.id, brandIdFromRequest(req));
  const vendorDb = brandWs.db;
  const { db, influencer } = await requireInfluencer(user.id);

  const { data: invitation } = await db
    .from("ugc_creator_invitations")
    .select("*, campaign:ugc_campaigns!campaign_id(id, title, brand_id)")
    .eq("id", id)
    .maybeSingle();

  if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  if (invitation.status !== "pending") {
    return NextResponse.json({ error: "Invitation is no longer pending" }, { status: 409 });
  }

  const isCreator =
    invitation.invitee_user_id === user.id ||
    (influencer != null && invitation.influencer_id === influencer.id);

  if (CREATOR_STATUSES.has(status) && !isCreator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (BRAND_STATUSES.has(status)) {
    const perm = await requireBrandPermission(db, invitation.brand_id, user.id, "creators.invite");
    if (!perm.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const now = new Date().toISOString();
  const { data: updated, error: uErr } = await db
    .from("ugc_creator_invitations")
    .update({ status, responded_at: now, updated_at: now })
    .eq("id", id)
    .select("*")
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  if (status === "accepted" && invitation.influencer_id) {
    const { data: part } = await db
      .from("ugc_campaign_participants")
      .select("id")
      .eq("campaign_id", invitation.campaign_id)
      .eq("influencer_id", invitation.influencer_id)
      .maybeSingle();

    if (part) {
      await db
        .from("ugc_campaign_participants")
        .update({ status: "accepted", joined_at: now })
        .eq("id", part.id);
    } else {
      await db.from("ugc_campaign_participants").insert({
        campaign_id: invitation.campaign_id,
        influencer_id: invitation.influencer_id,
        status: "accepted",
        joined_at: now,
      });
    }

    await recordUgcActivity(db, {
      campaignId: invitation.campaign_id,
      eventType: "invite_accepted",
      title: "Invitation accepted",
      actorUserId: user.id,
      influencerId: invitation.influencer_id,
      metadata: { invitation_id: id },
    });

    const campaign = invitation.campaign as { title?: string; brand_id?: string } | null;
    if (vendorDb && campaign?.brand_id) {
      const { data: brandVendor } = await db
        .from("vendors")
        .select("user_id")
        .eq("id", campaign.brand_id)
        .maybeSingle();
      if (brandVendor?.user_id) {
        await notifyUser(db, {
          userId: brandVendor.user_id,
          type: "system",
          title: "Invitation accepted",
          message: `A creator accepted your invite to "${campaign.title ?? "your campaign"}".`,
          actionUrl: `/ugc/campaign-center/${invitation.campaign_id}`,
          data: { campaignId: invitation.campaign_id, invitationId: id, event: "invite_accepted" },
          actorId: user.id,
          eventKey: `ugc.invite.accepted:${id}`,
          email: {
            kind: "account_notice",
            subject: `Invitation accepted — ${campaign.title ?? "your campaign"}`,
            titleLead: "Invitation ",
            titleAccent: "accepted",
            subtitle: `A creator accepted your invite to "${campaign.title ?? "your campaign"}".`,
            noticeTitle: "Next step",
            noticeBody: "Open the campaign to continue with this creator.",
            ctaLabel: "Open campaign",
            actionPath: `/ugc/campaign-center/${invitation.campaign_id}`,
            icon: "shield-check",
            idempotencyKey: `ugc.invite.accepted:${id}`,
          },
        });
      }
    }
  }

  if (status === "declined" || status === "cancelled") {
    await recordUgcActivity(db, {
      campaignId: invitation.campaign_id,
      eventType: status === "declined" ? "invite_declined" : "invite_cancelled",
      title: status === "declined" ? "Invitation declined" : "Invitation cancelled",
      actorUserId: user.id,
      influencerId: invitation.influencer_id,
      metadata: { invitation_id: id },
    });
  }

  return NextResponse.json({ invitation: updated });
}
