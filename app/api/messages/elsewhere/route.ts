import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type Item = {
  id: string;
  source: "marketplace" | "campaign";
  name: string;
  avatarUrl: string | null;
  context: string;
  lastMessage: string;
  lastMessageAt: string | null;
  fromMe: boolean;
  href: string;
};

/**
 * Marketplace and campaign chats for the signed-in person, so every message
 * shows up in one inbox with where it came from. Only chats the person is
 * part of are returned.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createServiceRoleClient() as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

  const [{ data: vendors }, { data: influencer }] = await Promise.all([
    db.from("vendors").select("id").eq("user_id", user.id),
    db.from("influencers").select("id").eq("user_id", user.id).maybeSingle(),
  ]);
  const vendorIds = ((vendors ?? []) as { id: string }[]).map((v) => v.id);
  const items: Item[] = [];

  // Marketplace buyer ↔ seller.
  const convOr = [`buyer_id.eq.${user.id}`, ...(vendorIds.length ? [`vendor_id.in.(${vendorIds.join(",")})`] : [])].join(",");
  const { data: convs } = await db
    .from("conversations")
    .select("id, buyer_id, vendor_id, updated_at, vendor:vendors!vendor_id (business_name, business_logo)")
    .or(convOr)
    .order("updated_at", { ascending: false })
    .limit(30);
  const convRows = (convs ?? []) as {
    id: string;
    buyer_id: string;
    vendor_id: string;
    updated_at: string;
    vendor?: { business_name?: string; business_logo?: string } | null;
  }[];
  if (convRows.length) {
    const buyerIds = [...new Set(convRows.filter((c) => c.buyer_id !== user.id).map((c) => c.buyer_id))];
    const [{ data: msgs }, { data: buyers }] = await Promise.all([
      db
        .from("conversation_messages")
        .select("conversation_id, sender_id, body, message_type, created_at")
        .in("conversation_id", convRows.map((c) => c.id))
        .order("created_at", { ascending: false })
        .limit(300),
      buyerIds.length ? db.from("profiles").select("id, full_name, avatar_url").in("id", buyerIds) : Promise.resolve({ data: [] }),
    ]);
    const last = new Map<string, { sender_id: string; body: string | null; message_type: string | null; created_at: string }>();
    for (const m of (msgs ?? []) as { conversation_id: string; sender_id: string; body: string | null; message_type: string | null; created_at: string }[]) {
      if (!last.has(m.conversation_id)) last.set(m.conversation_id, m);
    }
    const buyerById = new Map(((buyers ?? []) as { id: string; full_name?: string; avatar_url?: string }[]).map((b) => [b.id, b]));
    for (const c of convRows) {
      const m = last.get(c.id);
      if (!m) continue;
      const iAmBuyer = c.buyer_id === user.id;
      const other = iAmBuyer ? null : buyerById.get(c.buyer_id);
      items.push({
        id: `mkt_${c.id}`,
        source: "marketplace",
        name: iAmBuyer ? (c.vendor?.business_name ?? "Seller") : (other?.full_name ?? "Buyer"),
        avatarUrl: iAmBuyer ? (c.vendor?.business_logo ?? null) : (other?.avatar_url ?? null),
        context: iAmBuyer ? "Marketplace · you're buying" : "Marketplace · your store",
        lastMessage: m.body?.trim() || (m.message_type && m.message_type !== "text" ? `Sent a ${m.message_type.replace(/_/g, " ")}` : "Message"),
        lastMessageAt: m.created_at,
        fromMe: m.sender_id === user.id,
        href: `/messages?conversation=${c.id}`,
      });
    }
  }

  // UGC campaign brand ↔ creator.
  const infId = (influencer as { id?: string } | null)?.id ?? null;
  const threadOr = [...(vendorIds.length ? [`brand_id.in.(${vendorIds.join(",")})`] : []), ...(infId ? [`influencer_id.eq.${infId}`] : [])];
  if (threadOr.length) {
    const { data: threads } = await db
      .from("ugc_campaign_chat_threads")
      .select(
        "id, campaign_id, brand_id, influencer_id, last_message_at, last_message_preview, campaign:ugc_campaigns!campaign_id (title), influencer:influencers!influencer_id (display_name, profile_image), brand:vendors!brand_id (business_name, business_logo)",
      )
      .or(threadOr.join(","))
      .not("last_message_at", "is", null)
      .order("last_message_at", { ascending: false })
      .limit(30);
    for (const t of (threads ?? []) as {
      id: string;
      campaign_id: string;
      brand_id: string;
      influencer_id: string;
      last_message_at: string | null;
      last_message_preview: string | null;
      campaign?: { title?: string } | null;
      influencer?: { display_name?: string; profile_image?: string } | null;
      brand?: { business_name?: string; business_logo?: string } | null;
    }[]) {
      const iAmBrand = vendorIds.includes(t.brand_id);
      items.push({
        id: `ugc_${t.id}`,
        source: "campaign",
        name: iAmBrand ? (t.influencer?.display_name ?? "Creator") : (t.brand?.business_name ?? "Brand"),
        avatarUrl: iAmBrand ? (t.influencer?.profile_image ?? null) : (t.brand?.business_logo ?? null),
        context: `Campaign · ${t.campaign?.title ?? "UGC"}`,
        lastMessage: t.last_message_preview?.trim() || "Message",
        lastMessageAt: t.last_message_at,
        fromMe: false,
        href: `/ugc/${t.campaign_id}/chat?thread=${t.id}`,
      });
    }
  }

  items.sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
  return NextResponse.json({ data: items.slice(0, 40) });
}
