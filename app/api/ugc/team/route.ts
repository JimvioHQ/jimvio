import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor } from "@/lib/ugc/platform/auth";
import {
  defaultPermissions,
  requireBrandPermission,
  type BrandRole,
} from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

const VALID_ROLES: BrandRole[] = ["owner", "manager", "reviewer", "finance", "viewer"];

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  const { data, error: qErr } = await db
    .from("ugc_brand_members")
    .select(
      `
      *,
      profile:profiles!user_id (
        id, email, username, full_name, avatar_url
      )
    `
    )
    .eq("brand_id", vendor.id)
    .neq("status", "revoked")
    .order("created_at", { ascending: false });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  const perm = await requireBrandPermission(db, vendor.id, user.id, "team.manage");
  if (!perm.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const role = String(body.role ?? "viewer").toLowerCase() as BrandRole;
  if (!VALID_ROLES.includes(role) || role === "owner") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  let targetUserId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!targetUserId && email) {
    const { data: profile } = await db
      .from("profiles")
      .select("id, email")
      .ilike("email", email)
      .maybeSingle();
    if (!profile) return NextResponse.json({ error: "Email not found in profiles" }, { status: 404 });
    targetUserId = profile.id;
  }

  if (!targetUserId) {
    return NextResponse.json({ error: "email or user_id is required" }, { status: 400 });
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });
  }

  const { data: targetProfile } = await db
    .from("profiles")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();
  if (!targetProfile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const now = new Date().toISOString();
  const { data: member, error: upsErr } = await db
    .from("ugc_brand_members")
    .upsert(
      {
        brand_id: vendor.id,
        user_id: targetUserId,
        role,
        status: "pending",
        invited_by: user.id,
        permissions: { grants: defaultPermissions(role) },
        invited_at: now,
        updated_at: now,
      },
      { onConflict: "brand_id,user_id" }
    )
    .select(
      `
      *,
      profile:profiles!user_id (
        id, email, username, full_name, avatar_url
      )
    `
    )
    .single();

  if (upsErr) return NextResponse.json({ error: upsErr.message }, { status: 500 });
  return NextResponse.json({ member }, { status: 201 });
}
