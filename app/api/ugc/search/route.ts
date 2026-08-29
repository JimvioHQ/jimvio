import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";
import { listAccessibleBrandIds, optionalBrandWorkspace, brandIdFromRequest } from "@/lib/ugc/enterprise/brand-access";

export const dynamic = "force-dynamic";

function likePattern(q: string) {
  return `%${q.replace(/[%_]/g, (c) => `\\${c}`)}%`;
}

export async function GET(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q || q.length < 2) {
    return NextResponse.json({
      campaigns: [],
      creators: [],
      brands: [],
      library: [],
      invitations: [],
      applications: [],
    });
  }

  const pattern = likePattern(q);
  const brandWs = await optionalBrandWorkspace(user.id, brandIdFromRequest(req));
  const { influencer } = await requireInfluencer(user.id);
  const brandIds = await listAccessibleBrandIds(brandWs.db, user.id);
  const limit = 8;

  const campaignsPromise = (async () => {
    let query = db
      .from("ugc_campaigns")
      .select(
        "id, title, status, campaign_type, brand_id, ends_at, vendor:vendors!brand_id(business_name, business_logo)"
      )
      .or(`title.ilike."${pattern}",description.ilike."${pattern}"`)
      .limit(limit);

    if (brandIds.length) {
      query = query.or(`status.eq.active,brand_id.in.(${brandIds.join(",")})`);
    } else {
      query = query.eq("status", "active");
    }

    const { data } = await query;
    return data ?? [];
  })();

  const creatorsPromise = (async () => {
    if (!brandIds.length) return [];
    const { data } = await db
      .from("influencers")
      .select("id, display_name, profile_image, user_id, niche, total_followers")
      .ilike("display_name", pattern)
      .eq("is_active", true)
      .limit(limit);

    // Also match profiles.username → influencers
    const { data: profiles } = await db
      .from("profiles")
      .select("id, username")
      .ilike("username", pattern)
      .limit(limit);
    const userIds = (profiles ?? []).map((p) => p.id);
    let byUsername: typeof data = [];
    if (userIds.length) {
      const { data: more } = await db
        .from("influencers")
        .select("id, display_name, profile_image, user_id, niche, total_followers")
        .in("user_id", userIds)
        .eq("is_active", true)
        .limit(limit);
      byUsername = more ?? [];
    }

    const merged = [...(data ?? []), ...byUsername];
    const seen = new Set<string>();
    return merged.filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    }).slice(0, limit).map(({ user_id: _uid, ...rest }) => rest);
  })();

  const brandsPromise = (async () => {
    const { data } = await db
      .from("vendors")
      .select("id, business_name, business_logo, business_slug")
      .or(`business_name.ilike."${pattern}",business_slug.ilike."${pattern}"`)
      .limit(limit);
    return data ?? [];
  })();

  const libraryPromise = (async () => {
    const { data } = await db
      .from("ugc_content_library")
      .select("id, title, media_type, status, thumbnail_url, file_url, tags")
      .eq("user_id", user.id)
      .ilike("title", pattern)
      .limit(limit);
    return data ?? [];
  })();

  const invitationsPromise = (async () => {
    if (brandIds.length) {
      const { data } = await db
        .from("ugc_creator_invitations")
        .select(
          `
          id, status, invitee_username, invitee_email, message, created_at, campaign_id,
          campaign:ugc_campaigns!campaign_id(id, title)
        `
        )
        .in("brand_id", brandIds)
        .or(
          `invitee_username.ilike."${pattern}",invitee_email.ilike."${pattern}",message.ilike."${pattern}"`
        )
        .limit(limit);
      return data ?? [];
    }

    if (influencer) {
      const { data } = await db
        .from("ugc_creator_invitations")
        .select(
          `
          id, status, invitee_username, invitee_email, message, created_at, campaign_id,
          campaign:ugc_campaigns!campaign_id(id, title)
        `
        )
        .or(`invitee_user_id.eq.${user.id},influencer_id.eq.${influencer.id}`)
        .ilike("message", pattern)
        .limit(limit);
      return data ?? [];
    }

    return [];
  })();

  const applicationsPromise = (async () => {
    if (brandIds.length) {
      const { data: campaignIds } = await db
        .from("ugc_campaigns")
        .select("id")
        .in("brand_id", brandIds);
      const ids = (campaignIds ?? []).map((c) => c.id);
      if (!ids.length) return [];
      const { data } = await db
        .from("ugc_campaign_participants")
        .select(
          `
          id, status, application_message, joined_at, campaign_id, influencer_id,
          campaign:ugc_campaigns!campaign_id(id, title),
          influencer:influencers!influencer_id(id, display_name, profile_image)
        `
        )
        .in("campaign_id", ids)
        .in("status", ["pending", "waitlisted", "invited"])
        .ilike("application_message", pattern)
        .limit(limit);
      return data ?? [];
    }

    if (influencer) {
      const { data } = await db
        .from("ugc_campaign_participants")
        .select(
          `
          id, status, application_message, joined_at, campaign_id,
          campaign:ugc_campaigns!campaign_id(id, title, status)
        `
        )
        .eq("influencer_id", influencer.id)
        .ilike("application_message", pattern)
        .limit(limit);
      return data ?? [];
    }

    return [];
  })();

  const [campaigns, creators, brands, library, invitations, applications] =
    await Promise.all([
      campaignsPromise,
      creatorsPromise,
      brandsPromise,
      libraryPromise,
      invitationsPromise,
      applicationsPromise,
    ]);

  return NextResponse.json({
    q,
    campaigns,
    creators,
    brands,
    library,
    invitations,
    applications,
  });
}
