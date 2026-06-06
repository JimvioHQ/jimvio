import { createClient as createAdminClient } from "@supabase/supabase-js"

let _adminClient: ReturnType<typeof createAdminClient> | null = null

function adminDb() {
  if (!_adminClient) {
    _adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _adminClient
}

function sanitizePath(raw: string | null | undefined): string {
  const s = raw?.trim() ?? ""
  if (!s || !s.startsWith("/") || s.startsWith("//") || s.includes("://")) {
    return "/dashboard"
  }
  return s
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
      // No known roles — send to dashboard or requested path
      return hasExplicitNext ? safe : "/dashboard"
    }

    const roleHome = ROLE_HOME[topRole]

    // Admin always goes to /admin regardless of `next`
    if (topRole === "admin") return roleHome

    // For everyone else: honor an explicit `next`, otherwise use role home
    return hasExplicitNext ? safe : roleHome

  } catch (err) {
    console.error("[resolvePostLoginPath] unexpected error:", err)
    return hasExplicitNext ? safe : "/dashboard"
  }
}