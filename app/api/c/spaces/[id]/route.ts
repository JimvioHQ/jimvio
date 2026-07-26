import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  SPACE_SELECT,
  asSpaceRow,
  isSystemGroupSlug,
  mapSpaceToOwnerGroup,
  privacyWriteFields,
  resolveGroupManageContext,
  slugifyGroupName,
  type GroupPrivacyMode,
  GROUP_PRIVACY_VALUES,
} from "@/lib/community/owner-console/groups";
import { isSpaceType } from "@/lib/community/workspace/space-types";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

async function loadSpace(id: string) {
  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data, error } = await db
    .from("spaces")
    .select(SPACE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    admin: db,
    row: asSpaceRow(data),
    raw: data as Record<string, unknown>,
  };
}

/** GET /api/c/spaces/[id] — space detail for managers. */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const loaded = await loadSpace(id);
  if (!loaded) return NextResponse.json({ error: "Space not found" }, { status: 404 });

  const ctx = await resolveGroupManageContext(
    supabase,
    user.id,
    loaded.row.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  return NextResponse.json({
    space: {
      ...mapSpaceToOwnerGroup(loaded.row, []),
      spaceType: loaded.raw.space_type ?? "discussion",
      archivedBy: loaded.raw.archived_by ?? null,
    },
  });
}

/** PATCH /api/c/spaces/[id] — edit space metadata / visibility / type. */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`space-write:${user.id}`, 40, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many updates — try again shortly" }, { status: 429 });
  }

  const loaded = await loadSpace(id);
  if (!loaded) return NextResponse.json({ error: "Space not found" }, { status: 404 });

  const ctx = await resolveGroupManageContext(
    supabase,
    user.id,
    loaded.row.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  };

  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim().slice(0, 120);
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    if (isSystemGroupSlug(loaded.row.slug)) {
      return NextResponse.json(
        { error: "System space slug cannot be changed" },
        { status: 400 }
      );
    }
    patch.slug = slugifyGroupName(body.slug.trim()) || loaded.row.slug;
  }
  if (body.description !== undefined) {
    patch.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim().slice(0, 2000)
        : null;
  }
  if (body.icon !== undefined) {
    patch.icon =
      typeof body.icon === "string" && body.icon.trim() ? body.icon.trim() : null;
  }
  if (body.bannerUrl !== undefined || body.banner_url !== undefined) {
    const banner = body.bannerUrl ?? body.banner_url;
    patch.banner_url =
      typeof banner === "string" && banner.trim() ? banner.trim() : null;
  }
  if (body.coverUrl !== undefined || body.cover_url !== undefined) {
    const cover = body.coverUrl ?? body.cover_url;
    patch.cover_url =
      typeof cover === "string" && cover.trim() ? cover.trim() : null;
  }
  if (
    typeof body.privacy === "string" &&
    (GROUP_PRIVACY_VALUES as readonly string[]).includes(body.privacy)
  ) {
    Object.assign(patch, privacyWriteFields(body.privacy as GroupPrivacyMode));
  }
  if (body.spaceType !== undefined || body.space_type !== undefined) {
    const raw = body.spaceType ?? body.space_type;
    if (!isSpaceType(raw)) {
      return NextResponse.json({ error: "Invalid spaceType" }, { status: 400 });
    }
    patch.space_type = raw;
  }
  if (typeof body.isLocked === "boolean") patch.is_locked = body.isLocked;
  if (typeof body.isHidden === "boolean") {
    patch.is_hidden = body.isHidden;
    if (body.isHidden) patch.privacy = "hidden";
  }

  const { data: updated, error } = await loaded.admin
    .from("spaces")
    .update(patch)
    .eq("id", id)
    .select(SPACE_SELECT)
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status: 400 }
    );
  }

  const raw = updated as Record<string, unknown>;
  return NextResponse.json({
    space: {
      ...mapSpaceToOwnerGroup(asSpaceRow(updated), []),
      spaceType: raw.space_type ?? "discussion",
      archivedBy: raw.archived_by ?? null,
    },
  });
}

/**
 * POST /api/c/spaces/[id]
 * Body: { action: archive|restore|lock|unlock|delete, hard?: boolean }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`space-action:${user.id}`, 30, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many actions — try again shortly" }, { status: 429 });
  }

  const loaded = await loadSpace(id);
  if (!loaded) return NextResponse.json({ error: "Space not found" }, { status: 404 });

  const ctx = await resolveGroupManageContext(
    supabase,
    user.id,
    loaded.row.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = (await req.json()) as { action?: string; hard?: boolean };
  const action = body.action;
  const allowed = new Set([
    "archive",
    "restore",
    "lock",
    "unlock",
    "delete",
  ]);
  if (!action || !allowed.has(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (
    (action === "delete" || action === "archive") &&
    isSystemGroupSlug(loaded.row.slug)
  ) {
    return NextResponse.json(
      { error: "System spaces cannot be archived or deleted" },
      { status: 400 }
    );
  }

  if (action === "delete" && body.hard) {
    const { error } = await loaded.admin.from("spaces").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, deleted: true, action });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  };

  switch (action) {
    case "archive":
    case "delete":
      patch.is_active = false;
      patch.archived_at = new Date().toISOString();
      patch.archived_by = user.id;
      break;
    case "restore":
      patch.is_active = true;
      patch.archived_at = null;
      patch.archived_by = null;
      break;
    case "lock":
      patch.is_locked = true;
      break;
    case "unlock":
      patch.is_locked = false;
      break;
    default:
      break;
  }

  const { data: updated, error } = await loaded.admin
    .from("spaces")
    .update(patch)
    .eq("id", id)
    .select(SPACE_SELECT)
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Action failed" },
      { status: 400 }
    );
  }

  if (action === "lock" || action === "unlock") {
    await loaded.admin
      .from("rooms")
      .update({
        is_locked: action === "lock",
        updated_at: new Date().toISOString(),
      })
      .eq("space_id", id)
      .eq("is_active", true);
  }

  const raw = updated as Record<string, unknown>;
  return NextResponse.json({
    space: {
      ...mapSpaceToOwnerGroup(asSpaceRow(updated), []),
      spaceType: raw.space_type ?? "discussion",
      archivedBy: raw.archived_by ?? null,
    },
    action,
  });
}
