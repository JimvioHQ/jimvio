import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type PendingReleaseBalance =
  | { ok: true; pending: number; available: number }
  | { ok: false; reason: "insufficient_pending" | "invalid_amount" };

/** Move a pending payout into available balance without minting funds. */
export function balancesAfterPendingRelease(
  pending: number,
  available: number,
  amount: number,
): PendingReleaseBalance {
  if (!Number.isFinite(pending) || !Number.isFinite(available) || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }
  const pendingCents = Math.round(pending * 100);
  const availableCents = Math.round(available * 100);
  const amountCents = Math.round(amount * 100);
  if (amountCents <= 0) return { ok: false, reason: "invalid_amount" };
  if (pendingCents < amountCents) return { ok: false, reason: "insufficient_pending" };
  return {
    ok: true,
    pending: (pendingCents - amountCents) / 100,
    available: (availableCents + amountCents) / 100,
  };
}

/**
 * Moves ripe UGC earnings from pending balance to available balance.
 * "paid" here means the in-app hold elapsed. It is not an external bank transfer.
 * The status claim is compare-and-swap so two workers cannot release the same row.
 */
export async function releasePendingPayouts(): Promise<{
  released: number;
  errors: string[];
}> {
  const db = createServiceRoleClient();
  const errors: string[] = [];
  let released = 0;

  const { data: payouts, error: fetchErr } = await db
    .from("payouts")
    .select("*")
    .eq("status", "pending")
    .eq("type", "ugc_earnings")
    .lte("release_date", new Date().toISOString());

  if (fetchErr) {
    throw new Error(`Failed fetching pending payouts: ${fetchErr.message}`);
  }
  if (!payouts || payouts.length === 0) {
    return { released: 0, errors: [] };
  }

  for (const payout of payouts) {
    try {
      const notes = typeof payout.notes === "string" ? payout.notes : null;
      const { data: claimed, error: claimErr } = await db
        .from("payouts")
        .update({
          status: "paid",
          notes: notes?.replace("(Clears in 48h)", "(Cleared)") ?? notes,
        })
        .eq("id", payout.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (claimErr) throw new Error(`Payout ${payout.id} update err: ${claimErr.message}`);
      if (!claimed) continue;

      const revertClaim = async () => {
        await db
          .from("payouts")
          .update({ status: "pending", notes })
          .eq("id", payout.id)
          .eq("status", "paid");
      };

      const { data: wallet } = await db
        .from("wallets")
        .select("pending_balance, available_balance")
        .eq("user_id", payout.user_id)
        .maybeSingle();
      const { data: influencer } = await db
        .from("influencers")
        .select("id, pending_balance, available_balance")
        .eq("user_id", payout.user_id)
        .maybeSingle();

      if (!wallet && !influencer) {
        await revertClaim();
        errors.push(`Payout ${payout.id} has no wallet or creator balance to release`);
        continue;
      }

      const amount = Number(payout.amount);
      const walletNext = wallet
        ? balancesAfterPendingRelease(
            Number(wallet.pending_balance ?? 0),
            Number(wallet.available_balance ?? 0),
            amount,
          )
        : null;
      const influencerNext = influencer
        ? balancesAfterPendingRelease(
            Number(influencer.pending_balance ?? 0),
            Number(influencer.available_balance ?? 0),
            amount,
          )
        : null;

      if ((wallet && !walletNext?.ok) || (influencer && !influencerNext?.ok)) {
        await revertClaim();
        errors.push(`Payout ${payout.id} was not released because the pending balance is short`);
        continue;
      }

      if (wallet && walletNext?.ok) {
        const { data: walletRow } = await db
          .from("wallets")
          .update({
            pending_balance: walletNext.pending,
            available_balance: walletNext.available,
          })
          .eq("user_id", payout.user_id)
          .eq("pending_balance", wallet.pending_balance)
          .select("user_id")
          .maybeSingle();
        if (!walletRow) {
          await revertClaim();
          errors.push(`Payout ${payout.id} wallet update raced and was left pending`);
          continue;
        }
      }

      if (influencer && influencerNext?.ok) {
        const { data: influencerRow } = await db
          .from("influencers")
          .update({
            pending_balance: influencerNext.pending,
            available_balance: influencerNext.available,
          })
          .eq("id", influencer.id)
          .eq("pending_balance", influencer.pending_balance)
          .select("id")
          .maybeSingle();
        if (!influencerRow) {
          if (wallet && walletNext?.ok) {
            await db
              .from("wallets")
              .update({
                pending_balance: wallet.pending_balance,
                available_balance: wallet.available_balance,
              })
              .eq("user_id", payout.user_id)
              .eq("pending_balance", walletNext.pending);
          }
          await revertClaim();
          errors.push(`Payout ${payout.id} creator balance update raced and was left pending`);
          continue;
        }
      }

      await db
        .from("ugc_payouts")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("payout_id", payout.id)
        .eq("status", "pending");

      released++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      console.error(`[Clear Payouts] Error: ${msg}`);
    }
  }

  return { released, errors };
}
