import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { previewPrivilegedDenied } from "@/lib/ops/preview-guard";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Bootstrap / emergency admin emails from the server environment.
 *
 * Why this exists: operators listed in ADMIN_EMAILS can reach platform admin
 * surfaces before (or without) a `user_roles.role = 'admin'` row. The email
 * compared is always `supabase.auth.getUser().email` from the verified
 * session. Request body, query, localStorage, and client props are never used.
 * An arbitrary authenticated user cannot become admin by supplying an email.
 */
export function isBootstrapAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

function hasActiveAdminRole(
  roles: Array<{ role: string | null }> | null | undefined,
): boolean {
  return (
    roles?.some((r) => {
      const role = String(r.role);
      return role === "admin" || role === "super_admin";
    }) ?? false
  );
}

export type PlatformAdminOk = { ok: true; user: User };
export type PlatformAdminDenied = {
  ok: false;
  error: string;
  status: 401 | 403;
};

/**
 * Canonical platform-admin authorization.
 *
 * 1. Authenticate with getUser() (server session).
 * 2. Authorize: active DB admin role, or bootstrap ADMIN_EMAILS on the session email.
 * 3. Callers must create a service-role client only after this returns ok.
 */
export async function assertPlatformAdmin(): Promise<
  PlatformAdminOk | PlatformAdminDenied
> {
  const preview = previewPrivilegedDenied();
  if (preview) return preview;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated.", status: 401 };
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const isAdminRole = hasActiveAdminRole(roles);
  const isBootstrap = isBootstrapAdminEmail(user.email);

  if (!isAdminRole && !isBootstrap) {
    return { ok: false, error: "Admin access required.", status: 403 };
  }

  return { ok: true, user };
}

/** Route-handler shape used by existing /api/admin and ops callers. */
export async function requirePlatformAdmin() {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) {
    return {
      error: NextResponse.json(
        { error: auth.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: auth.status },
      ),
    };
  }
  return { user: auth.user };
}

/** Alias kept for existing API imports. */
export const requireAdmin = requirePlatformAdmin;
