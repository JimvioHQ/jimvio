import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  searchCommunities,
  type CommunitySearchType,
} from "@/services/community/search";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set<CommunitySearchType>(["posts", "members", "spaces", "rooms"]);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ results: [], q: "" });
  }
  if (q.length > 120) {
    return NextResponse.json({ error: "query too long" }, { status: 400 });
  }

  const communityId = searchParams.get("communityId");
  const spaceId = searchParams.get("spaceId");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20) || 20, 40);
  const typesParam = searchParams.get("types");
  const types = typesParam
    ? (typesParam
        .split(",")
        .map((t) => t.trim())
        .filter((t): t is CommunitySearchType => VALID_TYPES.has(t as CommunitySearchType)))
    : undefined;

  if (communityId) {
    const { data: membership } = await supabase
      .from("community_memberships")
      .select("id")
      .eq("community_id", communityId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "No access" }, { status: 403 });
    }
  }

  const results = await searchCommunities({
    q,
    userId: user.id,
    communityId,
    spaceId,
    types,
    limit,
  });

  return NextResponse.json({ results, q });
}
