import type { Database } from "@/types/supabase";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { timedFetch } from "@/lib/supabase/timed-fetch";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/public-env";

type SetAllCookies = NonNullable<CookieMethodsServer["setAll"]>;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      global: { fetch: timedFetch() },
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
