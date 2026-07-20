/**
 * instrumentation.ts
 * This file runs once when the Next.js server starts.
 * We use it to bootstrap a background interval for Shopify Sync on localhost,
 * and to validate Live Studio production infrastructure gates.
 */
export async function register() {
  // Only run this on the server-side Node.js environment
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logger } = await import("./lib/ops/logger");
    logger.info("server_boot", { runtime: process.env.NEXT_RUNTIME, environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV });
    const { validateLiveStudioEnvAtBoot } = await import("./lib/live/env");
    try {
      validateLiveStudioEnvAtBoot();
    } catch (e) {
      console.error("[Live Studio] Boot env validation failed:", e);
      throw e;
    }

    const { syncAllShopifyVendors } = await import("./services/shopifyProductSync");

    console.log("----------------------------------------------------");
    console.log("🚀 JIMVIO: Boot Sync Service Initialized");
    console.log("Mode: Startup execution only (Vercel Hobby Plan)");
    console.log("----------------------------------------------------");

    // Initial sync on startup (delayed by 10s to let the server breathe)
    setTimeout(async () => {
      console.log("[Boot-Sync] Running startup sync...");
      try {
        await syncAllShopifyVendors();
      } catch (e) {
        console.error("[Boot-Sync] Startup sync failed:", e);
      }
    }, 10000);
  }
}
