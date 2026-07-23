import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  GROUP_PRIVACY_VALUES,
  SPACE_SELECT,
  isSystemGroupSlug,
  asSpaceRow,
  mapSpaceToOwnerGroup,
  normalizeDefaultContent,
  normalizePermissionConfig,
  privacyWriteFields,
  resolveGroupManageContext,
  slugifyGroupName,
  type GroupPrivacyMode,
  type OwnerGroupStaffMember,
  type UpdateOwnerGroupInput,
} from "@/lib/community/owner-console/groups";

export const dynamic = "force-dynamic";

async function loadGroup(
  admin: ReturnType<typeof createServiceRoleClient>,
  groupId: string
) {
  const { data, error } = await admin
    .from("spaces")
    .select(SPACE_SELECT)
    .eq("id", groupId)
    .maybeSingle();
  if (error || !data) return null;
  return asSpaceRow(data);
}

async function loadStaff(
  admin: ReturnType<typeof createServiceRoleClient>,
  spaceId: string
): Promise<OwnerGroupStaffMember[]> {
  const { data } = await admin
    .from("space_staff")
    .select(
      "space_id, user_id, staff_role, created_at, profiles:user_id(full_name, username, avatar_url)"
    )
    .eq("space_id", spaceId);

  return (data ?? []).map((row) => {
    const profile = row.profiles as
      | { full_name: string | null; username: string | null; avatar_url: string | null }
      | { full_name: string | null; username: string | null; avatar_url: string | null }[]
      | null;
    const p = Array.isArray(profile) ? profile[0] : profile;
    return {
      userId: row.user_id,
      fullName: p?.full_name ?? null,
      username: p?.username ?? null,
      avatarUrl: p?.avatar_url ?? null,
      staffRole: (row.staff_role === "admin" ? "admin" : "moderator") as
        | "admin"
        | "moderator",
      createdAt: row.created_at,
    };
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const space = await loadGroup(admin, id);
  if (!space) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const ctx = await resolveGroupManageContext(
    supabase,
    user.id,
    space.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const staff = await loadStaff(admin, space.id);
  return NextResponse.json({
    group: mapSpaceToOwnerGroup(space, staff),
    community: ctx,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const space = await loadGroup(admin, id);
  if (!space) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const ctx = await resolveGroupManageContext(
    supabase,
    user.id,
    space.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = (await req.json()) as UpdateOwnerGroupInput;
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  };

  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim();
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    if (isSystemGroupSlug(space.slug)) {
      return NextResponse.json(
        { error: "System group slug cannot be changed" },
        { status: 400 }
      );
    }
    patch.slug = slugifyGroupName(body.slug.trim()) || space.slug;
  }
  if (body.description !== undefined) {
    patch.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }
  if (body.icon !== undefined) {
    patch.icon =
      typeof body.icon === "string" && body.icon.trim() ? body.icon.trim() : null;
  }
  if (body.coverUrl !== undefined) {
    patch.cover_url =
      typeof body.coverUrl === "string" && body.coverUrl.trim()
        ? body.coverUrl.trim()
        : null;
  }
  if (body.bannerUrl !== undefined) {
    patch.banner_url =
      typeof body.bannerUrl === "string" && body.bannerUrl.trim()
        ? body.bannerUrl.trim()
        : null;
  }
  if (body.color !== undefined) {
    patch.color =
      typeof body.color === "string" && body.color.trim()
        ? body.color.trim()
        : null;
  }
  if (
    body.privacy &&
    (GROUP_PRIVACY_VALUES as readonly string[]).includes(body.privacy)
  ) {
    Object.assign(patch, privacyWriteFields(body.privacy as GroupPrivacyMode));
  }
  if (body.welcomeMessage !== undefined) {
    patch.welcome_message =
      typeof body.welcomeMessage === "string" ? body.welcomeMessage : null;
  }
  if (body.rules !== undefined) {
    patch.rules = typeof body.rules === "string" ? body.rules : null;
  }
  if (body.permissionConfig) {
    patch.permission_config = normalizePermissionConfig({
      ...normalizePermissionConfig(space.permission_config),
      ...body.permissionConfig,
    });
  }
  if (body.defaultContent) {
    patch.default_content = normalizeDefaultContent({
      ...normalizeDefaultContent(space.default_content),
      ...body.defaultContent,
    });
  }
  if (typeof body.isFeatured === "boolean") patch.is_featured = body.isFeatured;
  if (typeof body.isPinned === "boolean") patch.is_pinned = body.isPinned;
  if (typeof body.isHidden === "boolean") {
    patch.is_hidden = body.isHidden;
    if (body.isHidden) patch.privacy = "hidden";
  }
  if (typeof body.isLocked === "boolean") patch.is_locked = body.isLocked;
  if (typeof body.sortOrder === "number") patch.sort_order = body.sortOrder;

  const { data: updated, error } = await admin
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

  const staff = await loadStaff(admin, id);
  return NextResponse.json({
    group: mapSpaceToOwnerGroup(asSpaceRow(updated), staff),
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const space = await loadGroup(admin, id);
  if (!space) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const ctx = await resolveGroupManageContext(
    supabase,
    user.id,
    space.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  if (isSystemGroupSlug(space.slug)) {
    return NextResponse.json(
      { error: "System groups cannot be deleted" },
      { status: 400 }
    );
  }

  const hard = req.nextUrl.searchParams.get("hard") === "1";
  if (hard) {
    const { error } = await admin.from("spaces").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, deleted: true });
  }

  const { data: updated, error } = await admin
    .from("spaces")
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(SPACE_SELECT)
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Archive failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    group: mapSpaceToOwnerGroup(asSpaceRow(updated), []),
    archived: true,
  });
}
