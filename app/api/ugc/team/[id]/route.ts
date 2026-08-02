import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor } from "@/lib/ugc/platform/auth";
import {
  defaultPermissions,
  roleCan,
  type BrandRole,
} from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

const VALID_ROLES: BrandRole[] = ["owner", "manager", "reviewer", "finance", "viewer"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });
  if (!roleCan("owner", "team.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await db
    .from("ugc_brand_members")
    .select("*")
    .eq("id", id)
    .eq("brand_id", vendor.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.role != null) {
    const role = String(body.role).toLowerCase() as BrandRole;
    if (!VALID_ROLES.includes(role) || role === "owner") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    updates.role = role;
    updates.permissions = { grants: defaultPermissions(role) };
  }

  if (body.status != null) {
    const status = String(body.status).toLowerCase();
    if (!["pending", "active", "revoked"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = status;
    if (status === "active") updates.accepted_at = new Date().toISOString();
  }

  const { data: member, error: uErr } = await db
    .from("ugc_brand_members")
    .update(updates)
    .eq("id", id)
    .eq("brand_id", vendor.id)
    .select(
      `
      *,
      profile:profiles!user_id (
        id, email, username, full_name, avatar_url
      )
    `
    )
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  return NextResponse.json({ member });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });
  if (!roleCan("owner", "team.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await db
    .from("ugc_brand_members")
    .select("id")
    .eq("id", id)
    .eq("brand_id", vendor.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const { error: uErr } = await db
    .from("ugc_brand_members")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("brand_id", vendor.id);

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
