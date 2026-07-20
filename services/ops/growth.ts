import { getAdminDB } from "@/services/base";

const admin = () => getAdminDB() as any;

export async function listCampaigns() {
  const { data, error } = await admin().from("growth_campaigns").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCampaign(input: {
  name: string; slug: string; channel: string; status?: string; startsAt?: string | null; endsAt?: string | null; metadata?: Record<string, unknown>; createdBy: string;
}) {
  const { data, error } = await admin().from("growth_campaigns").insert({
    name: input.name, slug: input.slug, channel: input.channel, status: input.status ?? "draft",
    starts_at: input.startsAt ?? null, ends_at: input.endsAt ?? null, metadata: input.metadata ?? {}, created_by: input.createdBy,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function createInviteCode(input: { inviterId: string; campaignId?: string | null; inviteeEmail?: string | null; expiresAt?: string | null }) {
  const code = `JMV-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const { data, error } = await admin().from("growth_invites").insert({
    code, inviter_id: input.inviterId, campaign_id: input.campaignId ?? null,
    invitee_email: input.inviteeEmail ?? null, expires_at: input.expiresAt ?? null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function listInvites(limit = 100) {
  const { data, error } = await admin().from("growth_invites").select("*, growth_campaigns(name, slug)").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getGrowthStats() {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [users, clicks] = await Promise.all([
    admin().from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
    admin().from("affiliate_clicks").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);
  return { newUsers7d: users.count ?? 0, affiliateClicks7d: clicks.error ? null : clicks.count ?? 0 };
}

export async function validateInvite(code: string) {
  const { data, error } = await admin().from("growth_invites").select("id, code, status, expires_at, invitee_email").eq("code", code).maybeSingle();
  if (error || !data) return null;
  const expired = Boolean(data.expires_at && new Date(data.expires_at) <= new Date());
  return { ...data, valid: data.status === "pending" && !expired };
}
