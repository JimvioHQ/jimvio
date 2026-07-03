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
      ?.vendor_id;

    if (!error && vendorId?.trim()) {
      return Response.json({
        vendorConfigured: true,
        source: "platform_settings",
      });
    }
  } catch {
    // fall through
  }

  return Response.json({
    vendorConfigured: false,
    message:
      "CJ vendor id not configured. Set CJ_VENDOR_ID env var or update platform_settings where key = 'cj_vendor_id'.",
  });
}
