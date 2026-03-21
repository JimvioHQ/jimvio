import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();

  // 1. Find the affiliate link
  const { data: link, error } = await supabase
    .from("affiliate_links")
    .select("id, affiliate_id, destination_url, is_active")
    .eq("link_code", code)
    .single();

  if (error || !link || !link.is_active) {
    // Fallback to home if link invalid
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Increment click count (async)
  // We use the admin client if needed, or just standard if RLS allows.
  // For simplicity, we'll use a RPC or just update.
  await supabase.rpc("increment_affiliate_click", { link_id: link.id });

  // 3. Set affiliate cookie (expires in 30 days)
  const response = NextResponse.redirect(new URL(link.destination_url, request.url));
  response.cookies.set("jimvio_ref", code, {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  return response;
}
