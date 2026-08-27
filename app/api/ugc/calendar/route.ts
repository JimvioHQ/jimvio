import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

type CalendarEvent = {
  id: string;
  type: "deadline" | "submission_due" | "payout" | "invitation";
  title: string;
  description: string | null;
  date: string;
  campaign_id: string | null;
  href: string | null;
  meta?: Record<string, unknown>;
};

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const { db, influencer, ready, completion } = await requireInfluencer(user.id);
  if (!ready || !influencer) {
    return NextResponse.json({
      data: [],
      needsProfile: true,
      complete: false,
      missing: completion.missing,
    });
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const events: CalendarEvent[] = [];

  const { data: participants } = await db
    .from("ugc_campaign_participants")
    .select(
      `
      status,
      campaign:ugc_campaigns!campaign_id (
        id, title, ends_at, status
      )
    `
    )
    .eq("influencer_id", influencer.id)
    .in("status", ["accepted", "invited", "pending"]);

  for (const row of participants ?? []) {
    const campaign = row.campaign as unknown as {
      id: string;
      title: string;
      ends_at: string | null;
      status: string;
    } | null;
    if (!campaign?.ends_at) continue;
    if (from && campaign.ends_at < from) continue;
    if (to && campaign.ends_at > to) continue;

    events.push({
      id: `deadline-${campaign.id}`,
      type: "deadline",
      title: `Deadline: ${campaign.title}`,
      description: "Campaign ends",
      date: campaign.ends_at,
      campaign_id: campaign.id,
      href: `/ugc/${campaign.id}`,
      meta: { campaign_status: campaign.status, participant_status: row.status },
    });

    if (row.status === "accepted") {
      events.push({
        id: `submission-due-${campaign.id}`,
        type: "submission_due",
        title: `Submit content: ${campaign.title}`,
        description: "Submission window closes with campaign",
        date: campaign.ends_at,
        campaign_id: campaign.id,
        href: `/ugc/${campaign.id}/submit`,
      });
    }
  }

  const { data: invitations } = await db
    .from("ugc_creator_invitations")
    .select(
      `
      id, status, created_at, message,
      campaign:ugc_campaigns!campaign_id ( id, title, ends_at )
    `
    )
    .or(`invitee_user_id.eq.${user.id},influencer_id.eq.${influencer.id}`)
    .eq("status", "pending");

  for (const inv of invitations ?? []) {
    const campaign = inv.campaign as unknown as {
      id: string;
      title: string;
      ends_at: string | null;
    } | null;
    const date = campaign?.ends_at ?? inv.created_at;
    if (from && date < from) continue;
    if (to && date > to) continue;
    events.push({
      id: `invite-${inv.id}`,
      type: "invitation",
      title: `Invite: ${campaign?.title ?? "Campaign"}`,
      description: inv.message,
      date,
      campaign_id: campaign?.id ?? null,
      href: campaign ? `/ugc/${campaign.id}` : "/ugc/invitations",
      meta: { invitation_id: inv.id },
    });
  }

  const { data: payouts } = await db
    .from("ugc_payouts")
    .select(
      `
      id, amount, status, paid_at, created_at, submission_id,
      submission:ugc_submissions!submission_id (
        campaign_id,
        campaign:ugc_campaigns!campaign_id ( id, title )
      )
    `
    )
    .eq("influencer_id", influencer.id)
    .order("created_at", { ascending: false })
    .limit(100);

  for (const p of payouts ?? []) {
    const date = p.paid_at ?? p.created_at;
    if (!date) continue;
    if (from && date < from) continue;
    if (to && date > to) continue;
    const submission = p.submission as unknown as {
      campaign_id: string;
      campaign: { id: string; title: string } | null;
    } | null;
    events.push({
      id: `payout-${p.id}`,
      type: "payout",
      title: `Payout ${p.status}: $${Number(p.amount ?? 0).toFixed(2)}`,
      description: submission?.campaign?.title ?? null,
      date,
      campaign_id: submission?.campaign_id ?? null,
      href: "/ugc/payouts",
      meta: { payout_id: p.id, status: p.status, amount: p.amount },
    });
  }

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return NextResponse.json({ data: events });
}
