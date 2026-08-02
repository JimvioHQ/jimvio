import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser, requireVendor, requireInfluencer } from "@/lib/ugc/platform/auth";
import { recordUgcActivity } from "@/lib/ugc/platform/activity";
import { notifyUser } from "@/lib/notifications/notify-user";

export const dynamic = "force-dynamic";

async function resolveInvitee(
  db: SupabaseClient,
  input: { influencer_id?: string; username?: string; email?: string }
) {
  let influencerId = input.influencer_id?.trim() || null;
  let inviteeUserId: string | null = null;
  let inviteeEmail = input.email?.trim().toLowerCase() || null;
  let inviteeUsername = input.username?.trim().replace(/^@/, "") || null;

  if (influencerId) {
    const { data: inf } = await db
      .from("influencers")
      .select("id, user_id, display_name")
      .eq("id", influencerId)
      .maybeSingle();
    if (!inf) return { error: "Influencer not found" as const };
    influencerId = inf.id;
    inviteeUserId = inf.user_id;
    if (!inviteeUsername && inf.user_id) {
      const { data: profile } = await db
        .from("profiles")
        .select("username, email")
        .eq("id", inf.user_id)
        .maybeSingle();
      inviteeUsername = profile?.username ?? null;
      inviteeEmail = inviteeEmail ?? profile?.email ?? null;
    }
  } else if (inviteeUsername) {
    const { data: profile } = await db
      .from("profiles")
      .select("id, email, username")
      .ilike("username", inviteeUsername)
      .maybeSingle();
    if (!profile) return { error: "Username not found" as const };
    inviteeUserId = profile.id;
    inviteeEmail = inviteeEmail ?? profile.email ?? null;
    const { data: inf } = await db
      .from("influencers")
      .select("id, user_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (inf) influencerId = inf.id;
  } else if (inviteeEmail) {
    const { data: profile } = await db
      .from("profiles")
      .select("id, email, username")
      .ilike("email", inviteeEmail)
      .maybeSingle();
    if (!profile) return { error: "Email not found" as const };
    inviteeUserId = profile.id;
    inviteeUsername = inviteeUsername ?? profile.username ?? null;
    const { data: inf } = await db
      .from("influencers")
      .select("id, user_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (inf) influencerId = inf.id;
  } else {
    return { error: "Provide influencer_id, username, or email" as const };
  }

  if (!influencerId) {
    return { error: "Invitee must have an influencer profile" as const };
  }

  if (!inviteeUserId) {
    const { data: inf } = await db
      .from("influencers")
      .select("user_id")
      .eq("id", influencerId)
      .maybeSingle();
    inviteeUserId = inf?.user_id ?? null;
  }

  return {
    influencerId,
    inviteeUserId,
    inviteeEmail,
    inviteeUsername,
    error: null,
  };
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const mine = searchParams.get("mine") === "true";
  const campaignId = searchParams.get("campaign_id") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  if (mine) {
    const { db, influencer } = await requireInfluencer(user.id);
    let query = db
      .from("ugc_creator_invitations")
      .select(
        `
        *,
        campaign:ugc_campaigns!campaign_id (
          id, title, status, ends_at, campaign_type,
          vendor:vendors!brand_id ( business_name, business_logo, business_slug )
        )
      `
      )
      .order("created_at", { ascending: false });

    if (influencer) {
      query = query.or(`invitee_user_id.eq.${user.id},influencer_id.eq.${influencer.id}`);
    } else {
      query = query.eq("invitee_user_id", user.id);
    }
    if (campaignId) query = query.eq("campaign_id", campaignId);
    if (status) query = query.eq("status", status);

    const { data, error: qErr } = await query;
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  }

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  let query = db
    .from("ugc_creator_invitations")
    .select(
      `
      *,
      influencer:influencers!influencer_id (
        id, display_name, profile_image, user_id
      ),
      campaign:ugc_campaigns!campaign_id ( id, title, status )
    `
    )
    .eq("brand_id", vendor.id)
    .order("created_at", { ascending: false });

  if (campaignId) query = query.eq("campaign_id", campaignId);
  if (status) query = query.eq("status", status);

  const { data, error: qErr } = await query;
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  const body = await req.json();
  const campaignId = String(body.campaign_id ?? "").trim();
  if (!campaignId) return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("id, title, brand_id")
    .eq("id", campaignId)
    .eq("brand_id", vendor.id)
    .maybeSingle();

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const resolved = await resolveInvitee(db, {
    influencer_id: body.influencer_id,
    username: body.username,
    email: body.email,
  });
  if (resolved.error) return NextResponse.json({ error: resolved.error }, { status: 400 });

  const { influencerId, inviteeUserId, inviteeEmail, inviteeUsername } = resolved;
  const message = typeof body.message === "string" ? body.message.trim() : null;
  const now = new Date().toISOString();

  const { data: existingPart } = await db
    .from("ugc_campaign_participants")
    .select("id, status")
    .eq("campaign_id", campaignId)
    .eq("influencer_id", influencerId!)
    .maybeSingle();

  if (existingPart) {
    if (!["accepted", "banned"].includes(existingPart.status)) {
      await db
        .from("ugc_campaign_participants")
        .update({ status: "invited", joined_at: now })
        .eq("id", existingPart.id);
    }
  } else {
    const { error: partErr } = await db.from("ugc_campaign_participants").insert({
      campaign_id: campaignId,
      influencer_id: influencerId!,
      status: "invited",
      joined_at: now,
    });
    if (partErr) return NextResponse.json({ error: partErr.message }, { status: 500 });
  }

  const { data: invitation, error: invErr } = await db
    .from("ugc_creator_invitations")
    .insert({
      campaign_id: campaignId,
      brand_id: vendor.id,
      invited_by: user.id,
      influencer_id: influencerId,
      invitee_user_id: inviteeUserId,
      invitee_email: inviteeEmail,
      invitee_username: inviteeUsername,
      status: "pending",
      message,
      updated_at: now,
    })
    .select("*")
    .single();

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

  if (inviteeUserId) {
    await notifyUser(db, {
      userId: inviteeUserId,
      type: "influencer",
      title: "Campaign invitation",
      message: message
        ? `You're invited to "${campaign.title}": ${message}`
        : `You're invited to join "${campaign.title}".`,
      actionUrl: `/ugc/${campaignId}`,
      data: {
        campaignId,
        invitationId: invitation.id,
        event: "campaign_invite",
      },
      actorId: user.id,
    });
  }

  await recordUgcActivity(db, {
    campaignId,
    eventType: "invite_sent",
    title: "Creator invited",
    description: inviteeUsername
      ? `Invited @${inviteeUsername}`
      : inviteeEmail
        ? `Invited ${inviteeEmail}`
        : "Creator invited",
    actorUserId: user.id,
    influencerId: influencerId!,
    metadata: { invitation_id: invitation.id },
  });

  return NextResponse.json({ invitation }, { status: 201 });
}
