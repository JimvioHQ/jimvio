import type { Database } from "@/types/supabase";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/service-role";

type SetAllCookies = NonNullable<CookieMethodsServer["setAll"]>;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore in Server Components
          }
        },
      },
    }
  );
}

export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  return await supabase.auth.getUser();
});
