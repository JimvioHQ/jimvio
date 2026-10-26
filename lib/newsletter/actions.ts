import { createSupabaseNewsletterStore } from "@/lib/newsletter/store";
import {
  confirmNewsletter,
  newsletterTokenSecret,
  unsubscribeNewsletter,
} from "@/lib/newsletter/subscription";
import { createServiceRoleClient, hasSupabaseSecretKey } from "@/lib/supabase/service-role";

export async function confirmNewsletterToken(token: string) {
  if (!hasSupabaseSecretKey()) return "not_configured" as const;
  return confirmNewsletter({
    token,
    store: createSupabaseNewsletterStore(createServiceRoleClient()),
    secret: newsletterTokenSecret(),
    nowSec: Math.floor(Date.now() / 1000),
  });
}

export async function unsubscribeNewsletterToken(token: string) {
  if (!hasSupabaseSecretKey()) return "not_configured" as const;
  return unsubscribeNewsletter({
    token,
    store: createSupabaseNewsletterStore(createServiceRoleClient()),
    secret: newsletterTokenSecret(),
    nowSec: Math.floor(Date.now() / 1000),
  });
}
