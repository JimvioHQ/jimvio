import { requireAdmin } from "@/lib/auth/api-helpers";
import { getCatalogMonitoring } from "@/lib/cj/premium-intelligence/catalog-repository";
import {
  getSchemaHealth,
  VERIFICATION_SQL,
} from "@/lib/cj/premium-intelligence/schema-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  try {
    const [schema, monitoring] = await Promise.all([
      getSchemaHealth(),
      getCatalogMonitoring(),
    ]);

    return Response.json({
      success: true,
      schema,
      monitoring,
      verificationSql: VERIFICATION_SQL,
      setup: {
        migration: schema.migrationFile,
        afterMigration: schema.afterMigration,
        cjVendorId:
          "Set CJ_VENDOR_ID in .env.local or platform_settings key cj_vendor_id with { vendor_id: \"...\" }",
      },
    });
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Health check failed",
      },
      { status: 500 }
    );
  }
}
