/**
 * instrumentation.ts
 * This file runs once when the Next.js server starts.
 * We use it to bootstrap a background interval for Shopify Sync on localhost.
 */
export async function register() {
  // Only run this on the server-side Node.js environment
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { syncAllShopifyVendors } = await import('./services/shopifyProductSync');

    console.log('----------------------------------------------------');
    console.log('🚀 JIMVIO: Background Sync Service Initialized');
    console.log('⏰ Interval: Every 5 minutes');
    console.log('----------------------------------------------------');

    // Initial sync on startup (delayed by 10s to let the server breathe)
    setTimeout(async () => {
       console.log('[Background-Sync] Running initial startup sync...');
       try {
         await syncAllShopifyVendors();
       } catch (e) {
         console.error('[Background-Sync] Startup sync failed:', e);
       }
    }, 10000);

    // Set recurring interval (5 minutes)
    setInterval(async () => {
      console.log('[Background-Sync] Running scheduled 5-minute Shopify sync...');
      try {
        const result = await syncAllShopifyVendors();
        console.log(`[Background-Sync] Sync Result: Succeeded=${result.succeeded}, Failed=${result.failed}`);
      } catch (error) {
        console.error('[Background-Sync] Error during scheduled sync:', error);
      }
    }, 5 * 60 * 1000); 
  }
}
