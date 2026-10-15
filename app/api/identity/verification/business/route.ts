import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureSellerVendor } from "@/lib/actions/seller-products";
import { isBusinessVerified } from "@/lib/products/authorization";
import {
  physicalSellerSupportHref,
  physicalSellingCustomerCopy,
  physicalSellingStatus,
} from "@/lib/products/physical-selling";
import { markPhysicalSellingRequested } from "@/lib/products/physical-selling-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — server-authoritative physical selling verification status. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await ensureSellerVendor(user.id);
  const admin = createServiceRoleClient() as any;
  const extra = vendor
    ? await admin
        .from("vendors")
        .select("physical_selling_requested_at, physical_selling_reviewed_at")
        .eq("id", vendor.id)
        .maybeSingle()
    : { data: null };
  const status = physicalSellingStatus({
    verification_status: vendor?.verification_status,
    physical_selling_requested_at: extra.data?.physical_selling_requested_at ?? null,
  });
  const customer = physicalSellingCustomerCopy(status);
  return NextResponse.json({
    verified: isBusinessVerified(vendor),
    paymentRequired: false,
    feePaid: false,
    feeUsd: null,
    phase: customer.phase,
    vendorStatus: vendor?.verification_status ?? null,
    physicalSellingStatus: status,
    requestedAt: extra.data?.physical_selling_requested_at ?? null,
    reviewedAt: extra.data?.physical_selling_reviewed_at ?? null,
    supportHref: physicalSellerSupportHref(),
    status: customer.key,
    customer: { key: customer.key, label: customer.label },
  });
}

/** POST — record a support review request. Does not start a payment or KYB session. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await ensureSellerVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Could not prepare seller account" }, { status: 500 });
  if (isBusinessVerified(vendor)) {
    return NextResponse.json({ verified: true, phase: "verified", paymentRequired: false });
  }
  await markPhysicalSellingRequested(user.id);
  return NextResponse.json({
    verified: false,
    paymentRequired: false,
    phase: "pending",
    supportHref: physicalSellerSupportHref(),
  });
}
