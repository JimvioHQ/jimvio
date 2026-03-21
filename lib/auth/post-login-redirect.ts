import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function sanitizePath(raw: string | null | undefined): string {
  const s = raw?.trim() ?? "";
  if (!s || !s.startsWith("/") || s.startsWith("//") || s.includes("://")) return "/dashboard";
  return s;
}

/** After login: admins go to /admin unless they asked for another specific path (not /dashboard). */
export async function resolvePostLoginPath(
  userId: string,
  rawNext: string | null | undefined
): Promise<string> {
  const requested = rawNext?.trim();
  const safe = sanitizePath(requested);

  const { data } = await adminDb()
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (data) {
    if (!requested || safe === "/dashboard") return "/admin";
    return safe;
  }

  return safe;
}
