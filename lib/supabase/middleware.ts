import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { extractSessionMeta, isSessionRevoked } from "@/lib/auth/user-sessions";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const protectedPaths = ["/dashboard", "/admin", "/settings"];
    const isProtected = protectedPaths.some((p) =>
      request.nextUrl.pathname.startsWith(p)
    );

    const hasSession = request.cookies.getAll().some(c => c.name.startsWith("sb-"));
    
    if (isProtected || hasSession) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const meta = extractSessionMeta(request.headers);
        const banned = await isSessionRevoked(user.id, meta).catch((err) => {
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
