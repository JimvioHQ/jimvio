import { invalidateCatalogCache } from "@/lib/cj/premium-intelligence/catalog-cache";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  try {
    const result = await bootstrapCatalog({
      runSyncIfEmpty: true,
      runEnrichment: true,
    });

    invalidateCatalogCache();

    return Response.json({
      success: result.schemaReady,
      ...result,
    });
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Bootstrap failed",
      },
      { status: 500 }
    );
  }
}
