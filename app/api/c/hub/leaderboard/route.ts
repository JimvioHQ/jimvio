import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function profileMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[]
) {
  if (!userIds.length) return new Map<string, { full_name: string | null; username: string | null }>();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username")
    .in("id", userIds);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get("tab") ?? "creators";
  const supabase = await createClient();

  if (tab === "affiliates") {
    const { data } = await supabase
      .from("affiliates")
      .select("id, user_id, total_earnings, total_conversions")
      .eq("is_active", true)
      .order("total_earnings", { ascending: false })
      .limit(25);
    const profiles = await profileMap(
      supabase,
      (data ?? []).map((r) => r.user_id).filter(Boolean)
    );
    return NextResponse.json({
      rows: (data ?? []).map((row, i) => {
        const p = profiles.get(row.user_id);
        return {
          id: row.id,
          name: p?.full_name || p?.username || "Affiliate",
          subtitle: `${Number(row.total_conversions ?? 0)} conversions`,
          score: Math.round(Number(row.total_earnings ?? 0)),
          href: p?.username ? `/u/${p.username}` : "/affiliates",
          rank: i + 1,
        };
      }),
    });
  }

  if (tab === "ugc") {
    const { data } = await supabase
      .from("influencers")
      .select("id, user_id, total_earnings")
      .order("total_earnings", { ascending: false })
      .limit(25);
    const profiles = await profileMap(
      supabase,
      (data ?? []).map((r) => r.user_id).filter(Boolean)
    );
    return NextResponse.json({
      rows: (data ?? []).map((row, i) => {
        const p = profiles.get(row.user_id);
        return {
          id: row.id,
          name: p?.full_name || p?.username || "UGC creator",
          subtitle: "UGC earnings",
          score: Math.round(Number(row.total_earnings ?? 0)),
          href: p?.username ? `/u/${p.username}` : "/ugc",
          rank: i + 1,
        };
      }),
    });
  }

  if (tab === "communities") {
    const { data } = await supabase
      .from("communities")
      .select("id, name, slug, member_count, post_count")
      .eq("is_active", true)
      .order("member_count", { ascending: false })
      .limit(25);
    return NextResponse.json({
      rows: (data ?? []).map((row, i) => ({
        id: row.id,
        name: row.name,
        subtitle: `${row.post_count ?? 0} posts`,
        score: Number(row.member_count ?? 0),
        href: `/communities/${row.slug}`,
        rank: i + 1,
      })),
    });
  }

  if (tab === "brands") {
    const { data } = await supabase
      .from("vendors")
      .select("id, business_name, business_slug, total_sales, verification_status")
      .eq("is_active", true)
      .order("total_sales", { ascending: false })
      .limit(25);
    return NextResponse.json({
      rows: (data ?? []).map((row, i) => ({
        id: row.id,
        name: row.business_name || "Brand",
        subtitle: row.verification_status || "Brand",
        score: Math.round(Number(row.total_sales ?? 0)),
        href: row.business_slug ? `/vendors/${row.business_slug}` : "/marketplace",
        rank: i + 1,
      })),
    });
  }

  const { data: points } = await supabase
    .from("member_points")
    .select("user_id, total_points, level")
    .order("total_points", { ascending: false })
    .limit(60);

  const profiles = await profileMap(
    supabase,
    [...new Set((points ?? []).map((r) => r.user_id).filter(Boolean))]
  );

  const seen = new Set<string>();
  const rows = [];
  for (const row of points ?? []) {
    if (!row.user_id || seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    const p = profiles.get(row.user_id);
    rows.push({
      id: row.user_id,
      name: p?.full_name || p?.username || "Creator",
      subtitle: `Level ${row.level ?? 1}`,
      score: Number(row.total_points ?? 0),
      href: p?.username ? `/u/${p.username}` : "/communities/explore",
      rank: rows.length + 1,
    });
    if (rows.length >= 25) break;
  }

  return NextResponse.json({ rows });
}
