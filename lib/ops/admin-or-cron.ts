import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";

/**
 * Session admin first; otherwise CRON_SECRET via Bearer / x-cron-secret.
 * Never accepts query-string secrets.
 */
export async function requireAdminSessionOrCron(request: Request): Promise<
  | { ok: true; user: User | null; via: "session" | "cron" }
  | { ok: false; error: NextResponse }
> {
  const admin = await assertPlatformAdmin();
  if (admin.ok) {
    return { ok: true, user: admin.user, via: "session" };
  }

  const cronErr = assertCronAuthorized(request);
  if (!cronErr) {
    return { ok: true, user: null, via: "cron" };
  }

  if (admin.status === 403) {
    return { ok: false, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: false, error: cronErr };
}
