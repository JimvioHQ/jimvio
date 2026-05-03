import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

    // Only call getUser if we are on a protected path or if we have a session cookie
    // This avoids unnecessary network calls for truly anonymous users on public pages.
    const hasSession = request.cookies.getAll().some(c => c.name.startsWith("sb-"));
    
    if (isProtected || hasSession) {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user && isProtected) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("redirect", request.nextUrl.pathname);
        return NextResponse.redirect(url);
      }
    }
  } catch (err) {
    // Don't block the request if middleware fails
    console.error("Middleware error:", err);
  }

  return supabaseResponse;
}
