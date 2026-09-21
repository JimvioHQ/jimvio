/**
 * instrumentation.ts — server boot hooks (monitoring + Live Studio env gates).
 * Shopify boot sync removed — native Jimvio stores + CJ are the commerce path.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logger } = await import("./lib/ops/logger");
    logger.info("server_boot", {
      runtime: process.env.NEXT_RUNTIME,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    });
    const { initProductionMonitoring } = await import("./lib/ops/monitoring");
    await initProductionMonitoring();
    const { validateLiveStudioEnvAtBoot } = await import("./lib/live/env");
    try {
      validateLiveStudioEnvAtBoot();
    } catch (e) {
      console.error("[Live Studio] Boot env validation failed:", e);
      throw e;
    }
  }
}
