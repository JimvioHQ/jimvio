import { accessPricingToPatch, validateAccessPricing } from "@/lib/community/access-pricing";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { mergeCommunitySettingsPreservingProvenance } from "@/lib/community/editorial-origin";
import {
  COMMUNITY_SETTINGS_SELECT,
  VISIBILITY_MODES,
  asCommunitySettingsRow,
  mapCommunitySettings,
  mergeSettingsConfig,
  resolveSettingsContext,
  slugifyCommunity,
  type UpdateOwnerSettingsInput,
} from "@/lib/community/owner-console/settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = req.nextUrl.searchParams.get("communityId")?.trim() ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const ctx = await resolveSettingsContext(
    supabase,
    user.id,
    communityId,
    "settings.view"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("communities")
    .select(COMMUNITY_SETTINGS_SELECT)
    .eq("id", communityId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Community not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    settings: mapCommunitySettings(asCommunitySettingsRow(data)),
    community: ctx,
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as UpdateOwnerSettingsInput;
  const communityId = body.communityId?.trim() ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const section = body.section;
  const required =
    section === "security" ? "security.manage" : "settings.manage";

  let ctx = await resolveSettingsContext(
    supabase,
    user.id,
    communityId,
    required as "settings.manage" | "security.manage"
  );
  if ("error" in ctx && required === "security.manage") {
    ctx = await resolveSettingsContext(
      supabase,
      user.id,
      communityId,
      "settings.manage"
    );
  }
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  const { data: existing, error: fetchErr } = await admin
    .from("communities")
    .select(COMMUNITY_SETTINGS_SELECT)
    .eq("id", communityId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const current = mapCommunitySettings(asCommunitySettingsRow(existing));
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };

  if (body.name != null) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    patch.name = name;
  }
  if (body.slug != null) {
    const slug = slugifyCommunity(body.slug);
    if (slug !== current.slug) {
      const { data: clash } = await admin
        .from("communities")
        .select("id")
        .eq("slug", slug)
        .neq("id", communityId)
        .maybeSingle();
      if (clash) {
        return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
      }
    }
    patch.slug = slug;
  }
  if (body.tagline !== undefined) patch.tagline = body.tagline;
  if (body.description !== undefined) patch.description = body.description;
  if (body.longDescription !== undefined) {
    patch.long_description = body.longDescription;
  }
  if (body.category !== undefined) patch.category = body.category;
  if (body.language !== undefined) patch.language = body.language;
  if (body.timezone !== undefined) patch.timezone = body.timezone;
  if (body.region !== undefined) patch.region = body.region;
  if (body.avatarUrl !== undefined) patch.avatar_url = body.avatarUrl;
  if (body.coverImage !== undefined) patch.cover_image = body.coverImage;
  if (body.bannerUrl !== undefined) patch.banner_url = body.bannerUrl;
  if (body.accentColor !== undefined) patch.accent_color = body.accentColor;
  if (body.tags !== undefined) patch.tags = body.tags;
  if (body.isFeatured !== undefined) patch.is_featured = body.isFeatured;
  if (body.isFree !== undefined) patch.is_free = body.isFree;
  if (body.currency !== undefined) patch.currency = body.currency;
  if (body.monthlyPrice !== undefined) patch.monthly_price = body.monthlyPrice;
  if (body.yearlyPrice !== undefined) patch.yearly_price = body.yearlyPrice;
  if (body.lifetimePrice !== undefined) {
    patch.lifetime_price = body.lifetimePrice;
  }
  if (body.trialDays !== undefined) patch.trial_days = body.trialDays;
  if (body.accessPricing !== undefined) {
    const invalid = validateAccessPricing(body.accessPricing);
    if (invalid) return NextResponse.json({ error: invalid.message, field: invalid.field }, { status: 400 });
    Object.assign(patch, accessPricingToPatch(body.accessPricing));
  }

  if (body.visibilityMode !== undefined) {
    if (!(VISIBILITY_MODES as readonly string[]).includes(body.visibilityMode)) {
      return NextResponse.json({ error: "Invalid visibilityMode" }, { status: 400 });
    }
    patch.visibility_mode = body.visibilityMode;
    patch.is_private =
      body.visibilityMode === "private" ||
      body.visibilityMode === "invite_only" ||
      body.visibilityMode === "hidden";
  } else if (body.isPrivate !== undefined) {
    patch.is_private = body.isPrivate;
    patch.visibility_mode = body.isPrivate ? "private" : "public";
  }

  let nextConfig = current.config;
  if (body.config) {
    nextConfig = mergeSettingsConfig(current.config, body.config);
    // Sync mirrored fields
    if (body.config.branding?.accentColor != null) {
      patch.accent_color = body.config.branding.accentColor;
    }
    if (body.config.branding?.bannerUrl !== undefined) {
      patch.banner_url = body.config.branding.bannerUrl;
    }
    if (body.config.discovery?.featured !== undefined) {
      patch.is_featured = body.config.discovery.featured;
    }
    if (body.config.discovery?.tags !== undefined) {
      patch.tags = body.config.discovery.tags;
    }
    if (body.config.privacy?.visibility !== undefined) {
      patch.visibility_mode = body.config.privacy.visibility;
      patch.is_private =
        body.config.privacy.visibility !== "public";
    }
    if (body.config.commerce?.currency !== undefined) {
      patch.currency = body.config.commerce.currency;
    }
    patch.settings = mergeCommunitySettingsPreservingProvenance(
      asCommunitySettingsRow(existing).settings,
      nextConfig as unknown as Record<string, unknown>,
    );
  }

  const { data, error } = await admin
    .from("communities")
    .update(patch)
    .eq("id", communityId)
    .select(COMMUNITY_SETTINGS_SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Update failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    settings: mapCommunitySettings(asCommunitySettingsRow(data)),
  });
}
