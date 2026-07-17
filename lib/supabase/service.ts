import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";

export function createServiceClient() {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey());
}
