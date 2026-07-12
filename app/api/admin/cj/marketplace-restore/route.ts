import { requireAdmin } from "@/lib/auth/api-helpers";
import { runMarketplaceRecovery } from "@/lib/cj/premium-intelligence/marketplace-restore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  try {
    const result = await runMarketplaceRecovery();
    return Response.json({ success: true, ...result });
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Marketplace restore failed",
      },
      { status: 500 }
    );
  }
}
