import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import {
  brandIdFromRequest,
  requireBrandWorkspace,
} from "@/lib/ugc/enterprise/brand-access";
import {
  defaultPermissions,
  requireBrandPermission,
  type BrandRole,
} from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

const VALID_ROLES: BrandRole[] = ["owner", "manager", "reviewer", "finance", "viewer"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const ws = await requireBrandWorkspace(user.id, brandIdFromRequest(req));
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;
  const perm = await requireBrandPermission(db, vendor.id, user.id, "team.manage");
  if (!perm.ok) {
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const ws = await requireBrandWorkspace(user.id, brandIdFromRequest(req));
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;
  const perm = await requireBrandPermission(db, vendor.id, user.id, "team.manage");
  if (!perm.ok) {
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
