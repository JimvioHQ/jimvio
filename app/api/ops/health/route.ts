import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseServiceKey: Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
  const ready = Object.values(checks).every(Boolean);
  return NextResponse.json({
    status: ready ? "ok" : "degraded",
    version: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
    checks,
  }, { status: ready ? 200 : 503 });
}
