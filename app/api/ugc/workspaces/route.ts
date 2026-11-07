import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { listAccessibleBrandIds } from "@/lib/ugc/enterprise/brand-access";
import { resolveBrandRole } from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, db, error } = await requireUser();
  if (!user || !db) return NextResponse.json({ error }, { status: 401 });

  const brandIds = await listAccessibleBrandIds(db, user.id);
  if (brandIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const { data: vendors, error: qErr } = await db
    .from("vendors")
    .select("id, business_name, business_logo, business_slug")
    .in("id", brandIds);

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const data = [];
  for (const vendor of vendors ?? []) {
    const role = await resolveBrandRole(db, vendor.id, user.id);
    if (!role) continue;
    data.push({
      id: vendor.id,
      name: vendor.business_name || vendor.business_slug || "Workspace",
      logo: vendor.business_logo,
      slug: vendor.business_slug,
      role,
    });
  }

  return NextResponse.json({ data, userId: user.id });
}
