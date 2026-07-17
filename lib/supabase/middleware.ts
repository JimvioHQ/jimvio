import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { extractSessionMeta, isSessionRevoked } from "@/lib/auth/user-sessions";
import { isHubAuthRequired } from "@/lib/community/hub-auth";
import {
  getMaintenanceModeEnabled,
  isMaintenanceExemptPath,
  userIsPlatformAdmin,
} from "@/lib/platform-maintenance";
import { isAccountAccessBlocked } from "@/lib/users/account-status";
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  hasSupabaseSecretKey,
} from "@/lib/supabase/service-role";

function isGuestOnlyAuthPath(pathname: string): boolean {
  if (pathname.startsWith("/login/2fa")) return false;
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password"
  );
}

function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  try {
    const pathname = request.nextUrl.pathname;
    const protectedPaths = ["/dashboard", "/admin", "/settings"];
    const isProtected =
      protectedPaths.some((p) => pathname.startsWith(p)) || isHubAuthRequired(pathname);
    const hasSession = hasSupabaseSession(request);
    const isGuestAuth = isGuestOnlyAuthPath(pathname);
    const maintenance = await getMaintenanceModeEnabled();

    // Anonymous public traffic — skip Supabase client + auth work entirely.
    if (!maintenance && !hasSession && !isProtected && !isGuestAuth) {
      return supabaseResponse;
    }

    // Maintenance wall for anonymous visitors (no auth client needed).
    if (maintenance && !isMaintenanceExemptPath(pathname) && !hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      url.search = "";
      return NextResponse.redirect(url);
    }

    const supabase = createServerClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
            );
          },
        },
      }
    );

    let cachedUser: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] | null = null;
    let userResolved = false;

    const resolveUser = async () => {
      if (!userResolved) {
        const { data: { user } } = await supabase.auth.getUser();
        cachedUser = user;
        userResolved = true;
      }
      return cachedUser;
    };

    if (maintenance && !isMaintenanceExemptPath(pathname)) {
      const maintenanceUser = await resolveUser();

      if (maintenanceUser) {
        const isAdmin = await userIsPlatformAdmin(
          maintenanceUser.id,
          maintenanceUser.email
        ).catch((err) => {
          console.error("[middleware] maintenance admin check failed:", err);
          return false;
        });

        if (!isAdmin) {
          await supabase.auth.signOut();
          const url = request.nextUrl.clone();
          url.pathname = "/maintenance";
          url.search = "";
          return NextResponse.redirect(url);
        }
      } else {
        const url = request.nextUrl.clone();
        url.pathname = "/maintenance";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    if (isProtected || hasSession || isGuestAuth) {
      const user = await resolveUser();

      if (user && hasSupabaseSecretKey()) {
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const accountStatus = meta.account_status as string | undefined;

        if (isAccountAccessBlocked(accountStatus, user.email, undefined)) {
          await supabase.auth.signOut();
          const url = request.nextUrl.clone();
          url.pathname = "/login";
          url.searchParams.set(
            "error",
            accountStatus === "deleted" ? "account_deleted" : "account_suspended",
          );
          url.searchParams.set("redirect", request.nextUrl.pathname);
          return NextResponse.redirect(url);
        }

        // Session revocation only on protected / auth-gated routes (avoids DB hit on every public page view).
        if (isProtected || isGuestAuth) {
          const metaSession = extractSessionMeta(request.headers);
          const banned = await isSessionRevoked(user.id, metaSession).catch((err) => {
            console.error("[middleware] session ban check failed:", err);
            return false;
          });

          if (banned) {
            await supabase.auth.signOut();
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("error", "session_revoked");
            url.searchParams.set("redirect", request.nextUrl.pathname);
            return NextResponse.redirect(url);
          }
        }
      }

      if (user && isGuestAuth) {
        const next =
          request.nextUrl.searchParams.get("next") ??
          request.nextUrl.searchParams.get("redirect");
        const destination = await resolvePostLoginPath(user.id, next);
        const url = request.nextUrl.clone();
        const dest = new URL(destination, request.nextUrl.origin);
        url.pathname = dest.pathname;
        url.search = dest.search;
        return NextResponse.redirect(url);
      }

      if (!user && isProtected) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("redirect", request.nextUrl.pathname);
        return NextResponse.redirect(url);
      }
    }
  } catch (err) {
    console.error("Middleware error:", err);
  }

  return supabaseResponse;
}
