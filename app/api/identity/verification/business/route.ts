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
import {
  BUSINESS_VERIFICATION_FEE_CURRENCY,
  BUSINESS_VERIFICATION_FEE_USD,
  formatBusinessVerificationFee,
} from "@/lib/identity/business-verification-fee";
import {
  getOpenPaidVerificationFee,
  hasPaidVerificationFee,
  markFeeConsumedByDiditSession,
} from "@/lib/identity/confirm-verification-fee";

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
  const feePaid = vendor ? await hasPaidVerificationFee(admin, vendor.id) : false;

  const { data: session } = await admin
    .from("jip_didit_sessions")
    .select("session_id, status, updated_at, decision_summary")
    .eq("user_id", user.id)
    .contains("decision_summary", { purpose: "business" })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let phase:
    | "verified"
    | "fee_required"
    | "fee_paid"
    | "in_progress"
    | "in_review"
    | "failed" = "fee_required";

  if (verified) phase = "verified";
  else if (businessStatus.key === "failed" || businessStatus.key === "expired") phase = "failed";
  else if (businessStatus.key === "in_review") phase = "in_review";
  else if (businessStatus.key === "in_progress" && feePaid) phase = "in_progress";
  else if (feePaid) phase = "fee_paid";
  else phase = "fee_required";

  return NextResponse.json({
    configured: diditBusinessConfigured(),
    verified,
    feePaid,
    feeUsd: BUSINESS_VERIFICATION_FEE_USD,
    currency: BUSINESS_VERIFICATION_FEE_CURRENCY,
    feeLabel: formatBusinessVerificationFee(),
    phase,
    vendorStatus: vendor?.verification_status ?? null,
    status: businessStatus.key,
    customer: {
      key: businessStatus.key,
      label: businessStatus.label,
    },
    sessionId: session?.session_id ?? null,
  });
}

/** POST — start Didit business (KYB) verification session. Requires paid fee. */
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
      feePaid: true,
      customer: mapDiditStatusToCustomer("Approved"),
    });
  }

  const admin = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const fee = await getOpenPaidVerificationFee(admin, vendor.id);
  if (!fee) {
    return NextResponse.json(
      {
        error: "Business verification fee required",
        code: "verification_fee_required",
        feePaid: false,
        feeUsd: BUSINESS_VERIFICATION_FEE_USD,
        currency: BUSINESS_VERIFICATION_FEE_CURRENCY,
        feeLabel: formatBusinessVerificationFee(),
      },
      { status: 402 },
    );
  }

  // Idempotent: reuse an already-linked Didit session for this paid fee
  if (fee.didit_session_id) {
    const { data: existing } = await admin
      .from("jip_didit_sessions")
      .select("session_id, status, verification_url")
      .eq("session_id", fee.didit_session_id)
      .maybeSingle();
    if (existing?.verification_url) {
      return NextResponse.json({
        sessionId: existing.session_id,
        verificationUrl: existing.verification_url,
        status: existing.status,
        feePaid: true,
        feeUsd: BUSINESS_VERIFICATION_FEE_USD,
        customer: mapDiditStatusToCustomer(existing.status),
        reused: true,
      });
    }
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
      fee_payment_id: fee.id,
    },
  });
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 502 });
  }

  // Claim this fee for the new session (prevents duplicate Didit sessions on double-click)
  const { data: claimed } = await admin
    .from("business_verification_fee_payments")
    .update({
      didit_session_id: created.sessionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fee.id)
    .eq("status", "paid")
    .is("didit_session_id", null)
    .select("id")
    .maybeSingle();

  if (!claimed) {
    // Another request won the race — return that session if present
    const openAgain = await getOpenPaidVerificationFee(admin, vendor.id);
    if (openAgain?.didit_session_id) {
      const { data: raced } = await admin
        .from("jip_didit_sessions")
        .select("session_id, status, verification_url")
        .eq("session_id", openAgain.didit_session_id)
        .maybeSingle();
      if (raced?.verification_url) {
        return NextResponse.json({
          sessionId: raced.session_id,
          verificationUrl: raced.verification_url,
          status: raced.status,
          feePaid: true,
          feeUsd: BUSINESS_VERIFICATION_FEE_USD,
          customer: mapDiditStatusToCustomer(raced.status),
          reused: true,
        });
      }
    }
  }

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
      decision_summary: {
        purpose: "business",
        vendor_id: vendor.id,
        fee_payment_id: fee.id,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );

  await markFeeConsumedByDiditSession(admin, fee.id, created.sessionId);

  return NextResponse.json({
    sessionId: created.sessionId,
    verificationUrl: created.verificationUrl,
    status: created.status,
    sessionKind: created.sessionKind,
    feePaid: true,
    feeUsd: BUSINESS_VERIFICATION_FEE_USD,
    customer: mapDiditStatusToCustomer(created.status),
  });
}
