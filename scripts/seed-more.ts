import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment before running seed-more.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedMore() {
  console.log('--- Starting Extended Seeding Process ---');

  // 1. Get existing data
  const { data: catData } = await supabase.from('product_categories').select('id, slug');
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  
  if (!profiles || profiles.length === 0) {
    console.error('No profiles found. cannot seed products without an owner/vendor.');
    return;
  }

  const userId = profiles[0].id;
  let { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', userId).single();
  
  if (!vendor) {
    console.log('Creating vendor...');
    const { data: v } = await supabase.from('vendors').insert({
      user_id: userId,
      business_name: 'Jimvio Premier Suppliers',
      business_slug: 'jimvio-premier',
      is_active: true,
      verification_status: 'verified'
    }).select().single();
    vendor = v;
  }

  const vendorId = vendor!.id;
  const cats: Record<string, string> = {};
  catData?.forEach(c => cats[c.slug] = c.id);

  const products = [
    // Electronics
    {
      name: 'OmniBook Pro 16', slug: 'omnibook-pro-16', price: 1899, compare_at_price: 2199,
      cat: 'electronics', img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800'
    },
    {
      name: 'VisionTab X Air', slug: 'visiontab-x', price: 649, compare_at_price: 799,
      cat: 'electronics', img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800'
    },
    {
      name: 'SonicWave Noise Cancelling Headphones', slug: 'sonicwave-headphones', price: 299, compare_at_price: 349,
      cat: 'electronics', img: 'https://images.unsplash.com/photo-1546435770-a3e426ff4737?w=800'
    },
    {
      name: 'SkyGuard 4K Drone', slug: 'skyguard-drone', price: 1199, compare_at_price: 1399,
      cat: 'electronics', img: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800'
    },
    {
      name: 'WristMove Smartwatch Z', slug: 'wristmove-z', price: 199, compare_at_price: 249,
      cat: 'electronics', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'
    },

    // Fashion
    {
      name: 'Shadow Leather Biker Jacket', slug: 'shadow-leather-jacket', price: 450, compare_at_price: 600,
      cat: 'fashion', img: 'https://images.unsplash.com/photo-1551028711-1358ef49c95b?w=800'
    },
    {
      name: 'Azure Runner Sneakers', slug: 'azure-runners', price: 120, compare_at_price: 150,
      cat: 'fashion', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'
    },
    {
      name: 'Silk Horizon Scarf', slug: 'silk-horizon-scarf', price: 85, compare_at_price: 110,
      cat: 'fashion', img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800'
    },
    {
      name: 'Heritage Canvas Tote Bag', slug: 'heritage-tote', price: 65, compare_at_price: 80,
      cat: 'fashion', img: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800'
    },
    {
      name: 'Midnight Slim-Fit Suit', slug: 'midnight-suit', price: 750, compare_at_price: 900,
      cat: 'fashion', img: 'https://images.unsplash.com/photo-1594932224828-b4b059b6f6f9?w=800'
    },

    // Industrial
    {
      name: 'Forge3D Resin Printer Pro', slug: 'forge3d-resin', price: 3500, compare_at_price: 3999,
      cat: 'machinery', img: 'https://images.unsplash.com/photo-1631281956016-3cdc1b2ef5fb?w=800'
    },
    {
      name: 'SolarStack 400W Panel Kit', slug: 'solarstack-kit', price: 599, compare_at_price: 749,
      cat: 'machinery', img: 'https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?w=800'
    },
    {
      name: 'PowerBase Silent Generator', slug: 'powerbase-generator', price: 1200, compare_at_price: 1500,
      cat: 'machinery', img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800'
    },
    {
      name: 'Titanium CNC Router X5', slug: 'titanium-cnc', price: 8500, compare_at_price: 10000,
      cat: 'machinery', img: 'https://images.unsplash.com/photo-1565106430349-41e976865261?w=800'
    },
    {
      name: 'AquaFlow High-Pressure Pump', slug: 'aquaflow-pump', price: 450, compare_at_price: 550,
      cat: 'machinery', img: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800'
    },

    // Health & Beauty
    {
      name: 'Radiance Vitamin C Serum', slug: 'radiance-serum', price: 45, compare_at_price: 60,
      cat: 'health', img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800'
    },
    {
      name: 'ZenFlow Eco Yoga Mat', slug: 'zenflow-yoga', price: 75, compare_at_price: 95,
      cat: 'health', img: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800'
    },
    {
      name: 'PureEssence Diffuser Set', slug: 'pureessence-diffuser', price: 120, compare_at_price: 145,
      cat: 'health', img: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800'
    },
    {
      name: 'DeepRelax Percussion Massager', slug: 'deeprelax-massager', price: 180, compare_at_price: 220,
      cat: 'health', img: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800'
    },
    {
      name: 'VitalGuard Collagen Plus', slug: 'vitalguard-collagen', price: 55, compare_at_price: 70,
      cat: 'health', img: 'https://images.unsplash.com/photo-1512675845772-b9623dc41991?w=800'
    },

    // Home & Garden
    {
      name: 'Lumina Smart Table Lamp', slug: 'lumina-smart-lamp', price: 89, compare_at_price: 120,
      cat: 'home', img: 'https://images.unsplash.com/photo-1507473885765-e6ed657f9971?w=800'
    },
    {
      name: 'ErgoPeak Mesh Office Chair', slug: 'ergopeak-chair', price: 450, compare_at_price: 599,
      cat: 'home', img: 'https://images.unsplash.com/photo-1505797149-43b00766ea16?w=800'
    },
    {
      name: 'BrewMaster Drip Coffee Maker', slug: 'brewmaster-coffee', price: 120, compare_at_price: 160,
      cat: 'home', img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800'
    },
    {
      name: 'PureBreeze Air Purifier 300', slug: 'purebreeze-300', price: 249, compare_at_price: 320,
      cat: 'home', img: 'https://images.unsplash.com/photo-1585771724684-252702b6628f?w=800'
    },
    {
      name: 'TerraCotta Ceramic Plant Pots', slug: 'terracotta-pots', price: 40, compare_at_price: 55,
      cat: 'home', img: 'https://images.unsplash.com/photo-1485955900006-10f4d324d445?w=800'
    }
  ];

  console.log(`Mapping and preparing ${products.length} products...`);
  const finalProducts = products.map(p => ({
    vendor_id: vendorId,
    category_id: cats[p.cat] || null,
    name: p.name,
    slug: p.slug,
    short_description: `Premium ${p.name} for global trade and local creators.`,
    price: p.price,
    compare_at_price: p.compare_at_price,
    status: 'active',
    is_active: true,
    is_featured: Math.random() > 0.7,
    images: [p.img],
    inventory_quantity: Math.floor(Math.random() * 500) + 10,
    product_type: 'physical'
  }));

  console.log('Inserting into Supabase...');
  const { error } = await supabase.from('products').upsert(finalProducts, { onConflict: 'slug' });

  if (error) {
    console.error('Error seeding products:', error);
  } else {
    console.log('Successfully seeded 25 new products!');
  }

  console.log('--- Seeding Complete ---');
}

seedMore();
