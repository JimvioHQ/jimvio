import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { sanitizeInternalPath } from "@/lib/auth/safe-path"

let _adminClient: ReturnType<typeof createAdminClient> | null = null

function adminDb() {
  if (!_adminClient) {
    _adminClient = createAdminClient(
      getSupabaseUrl(),
      getSupabaseSecretKey(),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _adminClient
}

function sanitizePath(raw: string | null | undefined): string {
  return sanitizeInternalPath(raw, "/dashboard")
}

// Role priority — highest wins
const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  vendor: "/dashboard/vendor",
  affiliate: "/dashboard",
  influencer: "/dashboard",
  buyer: "/dashboard",
}
const ROLE_PRIORITY = ["admin", "vendor", "affiliate", "influencer", "buyer"]

export async function resolvePostLoginPath(
  userId: string,
  rawNext: string | null | undefined
): Promise<string> {
  const safe = sanitizePath(rawNext)

  // If a specific destination was requested and it's not just /dashboard,
  // honor it — the user was trying to go somewhere
  const hasExplicitNext =
    rawNext?.trim() &&
    rawNext.trim() !== "/dashboard" &&
    safe !== "/dashboard"

  try {
    const { data, error } = await adminDb()
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("is_active", true)

    if (error) {
      console.error("[resolvePostLoginPath] role lookup failed:", error.message)
      return hasExplicitNext ? safe : "/dashboard"
    }

    const roles = ((data ?? []) as { role: string }[]).map(r => r.role)

    // Find the highest-priority role this user has
    const topRole = ROLE_PRIORITY.find(r => roles.includes(r))

    if (!topRole) {
      if (hasExplicitNext) return safe
      const { data: onboarding } = await adminDb()
        .from("user_onboarding")
        .select("welcome_completed_at")
        .eq("user_id", userId)
        .maybeSingle()
      const row = onboarding as { welcome_completed_at?: string | null } | null
      return row?.welcome_completed_at ? "/dashboard" : "/welcome"
    }

    const roleHome = ROLE_HOME[topRole]

    // Admin always goes to /admin regardless of `next`
    if (topRole === "admin") return roleHome

    // Explicit destinations win; do not interrupt a user who deliberately
    // entered a protected route before authenticating.
    if (hasExplicitNext) return safe

    const { data: onboarding, error: onboardingError } = await adminDb()
      .from("user_onboarding")
      .select("welcome_completed_at")
      .eq("user_id", userId)
      .maybeSingle()
    if (onboardingError) {
      console.error("[resolvePostLoginPath] onboarding lookup failed:", onboardingError.message)
    } else {
      const row = onboarding as { welcome_completed_at?: string | null } | null
      if (!row?.welcome_completed_at) return "/welcome"
    }

    return roleHome

  } catch (err) {
    console.error("[resolvePostLoginPath] unexpected error:", err)
    return hasExplicitNext ? safe : "/dashboard"
  }
}