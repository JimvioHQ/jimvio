import { NextResponse } from "next/server";
import { requireUser, requireVendor, requireInfluencer } from "@/lib/ugc/platform/auth";
import { matchCampaignsForCreator } from "@/lib/ugc/platform/matching";

export const dynamic = "force-dynamic";

type SmartNotification = {
  id: string;
  kind: "pending_invite" | "deadline" | "unpaid_payout" | "ai_match";
  title: string;
  message: string;
  actionUrl: string | null;
  priority: number;
  meta?: Record<string, unknown>;
};

export async function GET() {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { vendor } = await requireVendor(user.id);
  const { influencer } = await requireInfluencer(user.id);
  const items: SmartNotification[] = [];
  const now = Date.now();
  const in7d = now + 7 * 24 * 3600 * 1000;

  // Pending invites (creator)
  if (influencer) {
    const { data: invites } = await db
      .from("ugc_creator_invitations")
      .select(
        `
        id, message, created_at,
        campaign:ugc_campaigns!campaign_id ( id, title )
      `
      )
      .or(`invitee_user_id.eq.${user.id},influencer_id.eq.${influencer.id}`)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    for (const inv of invites ?? []) {
      const campaign = inv.campaign as unknown as { id: string; title: string } | null;
      items.push({
        id: `invite-${inv.id}`,
        kind: "pending_invite",
        title: "Pending campaign invite",
        message: campaign
          ? `You have an open invite to "${campaign.title}".`
          : "You have an open campaign invite.",
        actionUrl: campaign ? `/ugc/${campaign.id}` : "/ugc",
        priority: 90,
        meta: { invitation_id: inv.id },
      });
    }

    // Approaching deadlines (accepted campaigns ending within 7d)
    const { data: parts } = await db
      .from("ugc_campaign_participants")
      .select(
        `
        campaign:ugc_campaigns!campaign_id ( id, title, ends_at, status )
      `
      )
      .eq("influencer_id", influencer.id)
      .eq("status", "accepted");

    for (const row of parts ?? []) {
      const campaign = row.campaign as unknown as {
        id: string;
        title: string;
        ends_at: string | null;
        status: string;
      } | null;
      if (!campaign?.ends_at || campaign.status !== "active") continue;
      const endMs = new Date(campaign.ends_at).getTime();
      if (endMs < now || endMs > in7d) continue;
      const days = Math.ceil((endMs - now) / 86400000);
      items.push({
        id: `deadline-${campaign.id}`,
        kind: "deadline",
        title: "Deadline approaching",
        message: `"${campaign.title}" ends in ${days} day${days === 1 ? "" : "s"}.`,
        actionUrl: `/ugc/${campaign.id}`,
        priority: 80 + (7 - days),
        meta: { ends_at: campaign.ends_at },
      });
    }

    // Unpaid payouts
    const { data: unpaid } = await db
      .from("ugc_payouts")
      .select("id, amount, status, created_at")
      .eq("influencer_id", influencer.id)
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(10);

    for (const p of unpaid ?? []) {
      items.push({
        id: `payout-${p.id}`,
        kind: "unpaid_payout",
        title: p.status === "approved" ? "Payout processing" : "Unpaid earnings",
        message: `$${Number(p.amount ?? 0).toFixed(2)} is ${p.status}.`,
        actionUrl: "/ugc/payouts",
        priority: p.status === "approved" ? 70 : 75,
        meta: { payout_id: p.id, amount: p.amount, status: p.status },
      });
    }

    // AI match suggestions (top titles)
    try {
      const matches = await matchCampaignsForCreator(db, user.id, 3);
      if (matches.length) {
        const titles = matches.map((m) => m.title).filter(Boolean);
        items.push({
          id: "ai-match-top",
          kind: "ai_match",
          title: "Recommended campaigns",
          message: titles.length
            ? `Top matches for you: ${titles.join(" · ")}`
            : "New campaign matches are available.",
          actionUrl: "/ugc/matches",
          priority: 50,
          meta: {
            campaign_ids: matches.map((m) => m.id),
            titles,
          },
        });
      }
    } catch (err) {
      console.error("[smart notifications match]", err);
    }
  }

  // Brand: pending invites they sent that are still open + deadlines
  if (vendor) {
    const { data: brandInvites } = await db
      .from("ugc_creator_invitations")
      .select("id, invitee_username, campaign_id, campaign:ugc_campaigns!campaign_id(id, title)")
      .eq("brand_id", vendor.id)
      .eq("status", "pending")
      .limit(8);

    for (const inv of brandInvites ?? []) {
      const campaign = inv.campaign as unknown as { id: string; title: string } | null;
      items.push({
        id: `brand-invite-${inv.id}`,
        kind: "pending_invite",
        title: "Invite awaiting response",
        message: campaign
          ? `Invite to "${campaign.title}" is still pending${inv.invitee_username ? ` (@${inv.invitee_username})` : ""}.`
          : "A creator invite is still pending.",
        actionUrl: campaign
          ? `/ugc/campaign-center/${campaign.id}`
          : "/ugc/campaign-center",
        priority: 60,
      });
    }

    const { data: brandCampaigns } = await db
      .from("ugc_campaigns")
      .select("id, title, ends_at, status")
      .eq("brand_id", vendor.id)
      .eq("status", "active");

    for (const c of brandCampaigns ?? []) {
      if (!c.ends_at) continue;
      const endMs = new Date(c.ends_at).getTime();
      if (endMs < now || endMs > in7d) continue;
      const days = Math.ceil((endMs - now) / 86400000);
      items.push({
        id: `brand-deadline-${c.id}`,
        kind: "deadline",
        title: "Campaign ending soon",
        message: `"${c.title}" ends in ${days} day${days === 1 ? "" : "s"}.`,
        actionUrl: `/ugc/campaign-center/${c.id}`,
        priority: 65,
      });
    }
  }

  items.sort((a, b) => b.priority - a.priority);
  return NextResponse.json({ data: items });
}
