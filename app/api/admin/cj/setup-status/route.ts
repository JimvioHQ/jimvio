import { getServiceClient } from "@/lib/cj/client";
import { requireAdmin } from "@/lib/auth/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const envVendor = process.env.CJ_VENDOR_ID?.trim();
  if (envVendor) {
    return Response.json({
      vendorConfigured: true,
      source: "env",
      vendorId: envVendor,
      instructions: null,
    });
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "cj_vendor_id")
      .maybeSingle();

    const vendorId = (data as { value?: { vendor_id?: string } } | null)?.value
      ?.vendor_id?.trim();

    if (!error && vendorId) {
      return Response.json({
        vendorConfigured: true,
        source: "platform_settings",
        vendorId,
        instructions: null,
      });
    }

    const { data: vendorRow } = await supabase
      .from("vendors")
      .select("id, name, slug")
      .ilike("name", "%cj%")
      .limit(5);

    return Response.json({
      vendorConfigured: false,
      source: null,
      message:
        "CJ vendor id not configured. Import Intelligence catalog sync works without it; publishing requires a vendor id.",
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
  } catch {
    return Response.json({
      vendorConfigured: false,
      message:
        "CJ vendor id not configured. Set CJ_VENDOR_ID env var or platform_settings.cj_vendor_id.",
      instructions: {
        optionA: {
          title: "Environment variable",
          steps: ['CJ_VENDOR_ID="<vendors.id UUID>" in .env.local'],
        },
      },
    });
  }
}
