import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function diagnose() {
  console.log("📊 Analyzing Product Distribution...");
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, vendor_id, source, shopify_product_id');
    
  if (error) {
    console.error("Error:", error);
    return;
  }

  const stats = products.reduce((acc, p) => {
    const key = `${p.source || 'manual'} | Vendor: ${p.vendor_id}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log("\nTotal Products:", products.length);
  console.table(stats);
  
  const shopifyProducts = products.filter(p => p.source === 'shopify');
  console.log("\nTotal Shopify Products:", shopifyProducts.length);
}

diagnose();
