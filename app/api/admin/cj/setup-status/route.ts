import { getServiceClient, getCJVendorId } from "@/lib/cj/client";
import { requireAdmin } from "@/lib/auth/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  try {
    const supabase = getServiceClient();
    const vendorId = await getCJVendorId(supabase);
    const envVendor = process.env.CJ_VENDOR_ID?.trim();
    const source =
      envVendor && envVendor === vendorId ? "env" : "platform_settings";

    const { data: vendor } = await supabase
      .from("vendors")
      .select("id, business_name, business_slug")
      .eq("id", vendorId)
      .maybeSingle();

    return Response.json({
      vendorConfigured: true,
      source,
      vendorId,
      vendor: vendor ?? null,
      instructions: null,
    });
  } catch (err) {
    const supabase = getServiceClient();
    const { data: vendorRow } = await supabase
      .from("vendors")
      .select("id, business_name, business_slug")
      .or("business_name.ilike.%jimvio store%,business_name.ilike.%dropship%,business_slug.eq.jimvio-store,business_slug.eq.jimvio-dropshipping")
      .limit(5);

    return Response.json({
      vendorConfigured: false,
      source: null,
      message:
        err instanceof Error
          ? err.message
          : "CJ vendor id not configured. Import Intelligence catalog sync works without it; publishing requires a vendor id.",
      instructions: {
        optionA: {
          title: "Environment variable (recommended for local dev)",
          steps: [
            "Open .env.local",
            'Add: CJ_VENDOR_ID="<your-vendors.id UUID>"',
            "Restart the dev server",
          ],
        },
        optionB: {
          title: "Platform settings (production)",
          sql: `INSERT INTO platform_settings (key, value)
VALUES ('cj_vendor_id', jsonb_build_object('vendor_id', '<your-vendors.id UUID>'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
        },
        optionC: {
          title: "Find vendor UUID",
          hint:
            "Query vendors table for your CJ dropshipping vendor row, or create one in Admin → Vendors.",
          sampleVendors: vendorRow ?? [],
        },
      },
    });
  }
}
