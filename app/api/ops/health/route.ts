import { NextResponse } from "next/server";
import { createServiceRoleClient, hasSupabaseSecretKey } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, boolean> = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    supabasePublishableKey: Boolean(
      process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    ),
    supabaseSecretKeyConfigured: hasSupabaseSecretKey(),
    supabaseConnection: false,
  };

  // A non-empty environment variable does not prove that a credential is valid.
  // Use a read-only query and never expose provider errors or secret material.
  if (checks.supabaseUrl && checks.supabaseSecretKeyConfigured) {
    try {
      const db = createServiceRoleClient();
      const { error } = await db
        .from("platform_settings")
        .select("key")
        .limit(1);
      checks.supabaseConnection = !error;
    } catch {
      checks.supabaseConnection = false;
    }
  }

  const ready = Object.values(checks).every(Boolean);
  return NextResponse.json(
    {
      status: ready ? "ok" : "degraded",
      version: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
      checks,
    },
    {
      status: ready ? 200 : 503,
      headers: { "cache-control": "no-store, max-age=0" },
    },
  );
}
