import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createDiditSession,
  diditBusinessConfigured,
  mapDiditStatusToCustomer,
} from "@/lib/identity/didit";
import { ensureSellerVendor } from "@/lib/actions/seller-products";
import {
  businessVerificationCustomerStatus,
  isBusinessVerified,
} from "@/lib/products/authorization";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — business verification status for the signed-in seller. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await ensureSellerVendor(user.id);
  const verified = isBusinessVerified(vendor);
  const businessStatus = businessVerificationCustomerStatus(vendor?.verification_status);

  const admin = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: session } = await admin
    .from("jip_didit_sessions")
    .select("session_id, status, updated_at, decision_summary")
    .eq("user_id", user.id)
    .contains("decision_summary", { purpose: "business" })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    configured: diditBusinessConfigured(),
    verified,
    vendorStatus: vendor?.verification_status ?? null,
    status: businessStatus.key,
    customer: {
      key: businessStatus.key,
      label: businessStatus.label,
    },
    sessionId: session?.session_id ?? null,
  });
}

/** POST — start Didit business (KYB) verification session. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!diditBusinessConfigured()) {
    return NextResponse.json(
      { error: "Business verification is not configured yet", configured: false },
      { status: 503 },
    );
  }

  const vendor = await ensureSellerVendor(user.id);
  if (!vendor) {
    return NextResponse.json({ error: "Could not prepare seller account" }, { status: 500 });
  }

  if (isBusinessVerified(vendor)) {
    return NextResponse.json({
      verified: true,
      customer: mapDiditStatusToCustomer("Approved"),
    });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.jimvio.com").replace(/\/$/, "");
  const callbackUrl = `${appUrl}/marketplace/new?business_verification=1`;

  const created = await createDiditSession({
    userId: user.id,
    callbackUrl,
    purpose: "business",
    vendorData: user.id,
    metadata: {
      purpose: "business",
      vendor_id: vendor.id,
      source: "jimvio_physical_upload",
    },
  });
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 502 });
  }

  const admin = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  await admin.from("jip_didit_sessions").upsert(
    {
      user_id: user.id,
      session_id: created.sessionId,
      status: created.status,
      workflow_id:
        process.env.DIDIT_BUSINESS_WORKFLOW_ID?.trim() ||
        process.env.DIDIT_WORKFLOW_ID?.trim() ||
        null,
      verification_url: created.verificationUrl,
      vendor_data: user.id,
      decision_summary: { purpose: "business", vendor_id: vendor.id },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );

  return NextResponse.json({
    sessionId: created.sessionId,
    verificationUrl: created.verificationUrl,
    status: created.status,
    sessionKind: created.sessionKind,
    customer: mapDiditStatusToCustomer(created.status),
  });
}
