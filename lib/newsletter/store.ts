import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewsletterStatus, NewsletterStore, NewsletterSubscriber } from "./subscription";

type Row = {
  email_normalized: string;
  status: string;
  confirm_token_hash: string | null;
  unsubscribe_token_hash: string | null;
};

function asStatus(value: string): NewsletterStatus | null {
  if (value === "pending" || value === "confirmed" || value === "unsubscribed") return value;
  return null;
}

export function createSupabaseNewsletterStore(db: SupabaseClient): NewsletterStore {
  return {
    async findByEmail(email) {
      const { data, error } = await db
        .from("newsletter_subscribers")
        .select("email_normalized, status, confirm_token_hash, unsubscribe_token_hash")
        .eq("email_normalized", email)
        .maybeSingle();
      if (error || !data) return null;
      const row = data as Row;
      const status = asStatus(row.status);
      if (!status) return null;
      return {
        email_normalized: row.email_normalized,
        status,
        confirm_token_hash: row.confirm_token_hash,
        unsubscribe_token_hash: row.unsubscribe_token_hash,
      } satisfies NewsletterSubscriber;
    },
    async save(row) {
      const { error } = await db.from("newsletter_subscribers").upsert(
        {
          email: row.email,
          email_normalized: row.email_normalized,
          status: row.status,
          consent_text: row.consent_text,
          confirm_token_hash: row.confirm_token_hash,
          unsubscribe_token_hash: row.unsubscribe_token_hash,
          confirmed_at: row.confirmed_at,
          unsubscribed_at: row.unsubscribed_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email_normalized" },
      );
      return error ? { ok: false } : { ok: true };
    },
  };
}
