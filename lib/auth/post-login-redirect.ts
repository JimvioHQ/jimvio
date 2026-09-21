import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { sanitizeInternalPath } from "@/lib/auth/safe-path"
import { isAuthCompletionPath, isPasswordResetPath } from "@/lib/auth/recovery-session"

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
  return sanitizeInternalPath(raw, "/")
}

/** Default destination after a successful platform login when no deep-link is present. */
export const DEFAULT_POST_LOGIN_PATH = "/communities"

/** Default destination after login on a merchant storefront host. */
export const MERCHANT_POST_LOGIN_PATH = "/"

/**
 * Jimvio platform destinations that must never be the post-auth landing
 * for a merchant storefront customer session.
 */
const PLATFORM_DESTINATION_PREFIXES = [
  "/communities",
  "/marketplace",
  "/affiliates",
  "/ugc",
  "/commerce",
  "/dashboard",
  "/welcome",
  "/admin",
  "/wallet",
  "/identity",
  "/seller",
  "/creator",
  "/dropshipping",
  "/owner",
  "/library",
  "/messages",
  "/inbox",
  "/notifications",
  "/saved",
  "/activate",
  "/settings",
] as const

export function isPlatformDestinationPath(path: string): boolean {
  const bare = (path.split("?")[0] || "/").trim()
  if (!bare.startsWith("/")) return false
  return PLATFORM_DESTINATION_PREFIXES.some(
    (prefix) => bare === prefix || bare.startsWith(`${prefix}/`),
  )
}

export type ResolvePostLoginOptions = {
  /** When true, default to merchant storefront home and reject platform `next` paths. */
  merchantStorefront?: boolean
}

// Role priority — highest wins.
// Vendors land on /communities like other members; UGC Campaign Center is intentional
// navigation only (never the global post-login default).
const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  vendor: DEFAULT_POST_LOGIN_PATH,
  affiliate: DEFAULT_POST_LOGIN_PATH,
  influencer: DEFAULT_POST_LOGIN_PATH,
  buyer: DEFAULT_POST_LOGIN_PATH,
}
const ROLE_PRIORITY = ["admin", "vendor", "affiliate", "influencer", "buyer"]

function effectiveNextForContext(
  rawNext: string | null | undefined,
  merchantStorefront: boolean,
): string | null | undefined {
  if (!rawNext?.trim()) return rawNext
  if (!merchantStorefront) return rawNext
  const safe = sanitizePath(rawNext)
  if (isPlatformDestinationPath(safe)) return null
  return rawNext
}

export async function resolvePostLoginPath(
  userId: string,
  rawNext: string | null | undefined,
  options?: ResolvePostLoginOptions
): Promise<string> {
  const merchant = options?.merchantStorefront === true
  const defaultHome = merchant ? MERCHANT_POST_LOGIN_PATH : DEFAULT_POST_LOGIN_PATH
  const scopedNext = effectiveNextForContext(rawNext, merchant)

  const incoming = sanitizePath(scopedNext)
  const safe = isPasswordResetPath(incoming) ? "/" : incoming

  if (isAuthCompletionPath(safe) && !isPasswordResetPath(safe)) return safe

  // If a specific destination was requested and it's not just /,
  // honor it — the user was trying to go somewhere
  const hasExplicitNext =
    Boolean(scopedNext?.trim()) &&
    scopedNext!.trim() !== "/" &&
    safe !== "/"

  // Merchant customers never enter platform onboarding or role homes.
  if (merchant) {
    if (hasExplicitNext && !isPlatformDestinationPath(safe)) return safe
    return MERCHANT_POST_LOGIN_PATH
  }

  try {
    const { data, error } = await adminDb()
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("is_active", true)

    if (error) {
      console.error("[resolvePostLoginPath] role lookup failed:", error.message)
      return hasExplicitNext ? safe : defaultHome
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
      return row?.welcome_completed_at ? defaultHome : "/welcome"
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
    return hasExplicitNext ? safe : defaultHome
  }
}
