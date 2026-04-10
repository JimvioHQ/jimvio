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
    console.log('🚀 JIMVIO: Boot Sync Service Initialized');
    console.log('Mode: Startup execution only (Vercel Hobby Plan)');
    console.log('----------------------------------------------------');

    // Initial sync on startup (delayed by 10s to let the server breathe)
    setTimeout(async () => {
       console.log('[Boot-Sync] Running startup sync...');
       try {
         await syncAllShopifyVendors();
       } catch (e) {
         console.error('[Boot-Sync] Startup sync failed:', e);
       }
    }, 10000);
  }
}
