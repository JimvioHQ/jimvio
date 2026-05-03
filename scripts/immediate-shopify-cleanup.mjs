/**
 * scripts/immediate-shopify-cleanup.mjs
 * Run this to manually trigger a full Shopify sync and delete all "ghost" products immediately.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { syncAllShopifyVendors } from '../services/shopifyProductSync.js';

dotenv.config({ path: '.env.local' });

async function run() {
  console.log("🚀 Starting Immediate Shopify Cleanup...");
  
  try {
    const result = await syncAllShopifyVendors();
    console.log("✅ Cleanup Complete!");
    console.log(`- Succeeded Vendors: ${result.succeeded}`);
    console.log(`- Failed Vendors: ${result.failed}`);
    console.log("\nCheck your marketplace now; the 46 products should now match your Shopify count.");
  } catch (error) {
    console.error("❌ Cleanup Failed:", error.message);
  }
}

run();
