import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { WalletSurface } from "@/lib/wallet-os/types";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

/** `wallet_activity_log.surface` allows two extra buckets beyond the Wallet OS surfaces. */
export type WalletActivitySurface = WalletSurface | "security" | "system";

export interface LogWalletActivityInput {
  userId: string;
  action: string;
  surface?: WalletActivitySurface;
  amount?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  db?: ServiceClient;
}

/** Append-only audit log helper. Never throws — logging failures must not break the caller's flow. */
export async function logWalletActivity(input: LogWalletActivityInput): Promise<void> {
  const client = input.db ?? createServiceRoleClient();
  try {
    const surface: WalletActivitySurface = input.surface ?? "system";
    await client.from("wallet_activity_log").insert({
      user_id: input.userId,
      action: input.action,
      surface: surface === "other" ? "system" : surface,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      metadata: input.metadata ?? {},
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null,
    });
  } catch (err) {
    console.error("logWalletActivity failed", err);
  }
}

export interface ListWalletActivityOptions {
  limit?: number;
  cursor?: string | null;
}

export async function listWalletActivity(
  userId: string,
  opts: ListWalletActivityOptions = {},
  db?: ServiceClient,
) {
  const client = db ?? createServiceRoleClient();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);

  let query = client
    .from("wallet_activity_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.cursor) query = query.lt("created_at", opts.cursor);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
