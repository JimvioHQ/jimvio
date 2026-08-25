import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/public-env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  const client = createBrowserClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
  );

  if (typeof window !== "undefined") {
    browserClient = client;
  }

  return client;
}
