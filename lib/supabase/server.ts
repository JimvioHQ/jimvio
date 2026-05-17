// import { Database } from "@/types/supabase";
// import { createServerClient } from "@supabase/ssr";
// import { cookies } from "next/headers";
// import { cache } from "react";

// export async function createClient() {
//   const cookieStore = await cookies();

//   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
//   const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

//   return createServerClient<Database>(supabaseUrl, supabaseKey, {
//     cookies: {
//       getAll() {
//         return cookieStore.getAll();
//       },
//       setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
//         try {
//           cookiesToSet.forEach(({ name, value, options }) =>
//             cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
//           );
//         } catch {
//           // Ignore in Server Components
//         }
//       },
//     },
//   });
// }


// export const getCachedUser = cache(async () => {
//   const supabase = await createClient();
//   return await supabase.auth.getUser();
// });

import type { Database } from "@/types/supabase";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

type SetAllCookies = NonNullable<CookieMethodsServer["setAll"]>;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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