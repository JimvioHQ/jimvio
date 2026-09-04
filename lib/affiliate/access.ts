/**
 * Canonical affiliate access helpers.
 * Source of truth: public.affiliates.is_active for the authenticated user.
 */

import { createClient } from "@/lib/supabase/server";

export type SessionAffiliate = {
  id: string;
  userId: string;
  affiliateCode: string;
  isActive: boolean;
};

export async function getSessionAffiliate(opts?: {
  /** When true (default for dashboard/API gates), inactive rows are treated as missing. */
  requireActive?: boolean;
}): Promise<SessionAffiliate | null> {
  const requireActive = opts?.requireActive !== false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("affiliates")
    .select("id, user_id, affiliate_code, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  if (requireActive && !data.is_active) return null;

  return {
    id: data.id,
    userId: data.user_id,
    affiliateCode: data.affiliate_code,
    isActive: Boolean(data.is_active),
  };
}
