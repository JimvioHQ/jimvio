import { toPublicPayload } from "@/lib/marketplace/public-product";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchFeaturedCollections } from "@/lib/marketplace/collections";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const collections = await fetchFeaturedCollections(supabase, 12);
  return NextResponse.json({ collections: toPublicPayload(collections) });
}
