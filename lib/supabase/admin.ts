// lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!url || !serviceKey) {
        throw new Error("Missing Supabase service role env vars");
    }

    return createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}


if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
}

/**
 * Returns a Supabase client that uses the service-role key.
 * Bypasses RLS — only use in server-side admin actions.
 */
export function getAdminDB() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}