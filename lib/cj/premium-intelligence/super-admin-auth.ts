/**
 * Super Admin auth for sensitive auto-publish operations.
 */

import { createClient } from "@/lib/supabase/server";

export async function assertSuperAdminAccess(): Promise<
  { ok: true; user: { id: string; email?: string } } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isSuperAdmin = roles?.some((r) => String(r.role) === "super_admin") ?? false;
  const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const isSuperAdminEmail = superAdminEmails.includes(user.email ?? "");

  if (!isSuperAdmin && !isSuperAdminEmail) {
    return { ok: false, error: "Super Admin access required." };
  }

  return { ok: true, user: { id: user.id, email: user.email } };
}

export async function assertAdminAccess(): Promise<
  { ok: true; user: { id: string; email?: string } } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdmin =
    roles?.some((r) => {
      const role = String(r.role);
      return role === "admin" || role === "super_admin";
    }) ?? false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const isAdminEmail = adminEmails.includes(user.email ?? "");

  if (!isAdmin && !isAdminEmail) {
    return { ok: false, error: "Admin access required." };
  }

  return { ok: true, user: { id: user.id, email: user.email } };
}
