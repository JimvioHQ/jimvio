import { NextResponse } from "next/server";
import { getMcpResourceUrl } from "@/lib/auth/mcp-token";
import { getSupabaseUrl } from "@/lib/supabase/public-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const resource = getMcpResourceUrl();
  const supabaseAuth = `${getSupabaseUrl().replace(/\/$/, "")}/auth/v1`;
  return NextResponse.json({
    resource,
    authorization_servers: [supabaseAuth],
    scopes_supported: ["openid", "email", "profile"],
    bearer_methods_supported: ["header"],
    resource_documentation: "https://www.jimvio.com/media",
  }, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
