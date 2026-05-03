import { createServiceRoleClient } from '@/lib/supabase/service-role';

/**
 * Sweeps through the payouts table and shifts funds from
 * pending_balance to available_balance if the 48-hour fraud delay has elapsed.
 * Usually invoked via a secondary Vercel Cron.
 */
export async function releasePendingPayouts(): Promise<{
  released: number;
  errors: string[];
}> {
  const db = createServiceRoleClient();
  const errors: string[] = [];
  let released = 0;

  // 1. Find all ripe pending payouts
  const { data: payouts, error: fetchErr } = await db
    .from('payouts')
    .select('*')
    .eq('status', 'pending')
    .eq('type', 'ugc_earnings')
    .lte('release_date', new Date().toISOString());

  if (fetchErr) {
    throw new Error(`Failed fetching pending payouts: ${fetchErr.message}`);
  }

  if (!payouts || payouts.length === 0) {
    return { released: 0, errors: [] };
  }

  for (const payout of payouts) {
    try {
      // 2. Mark this payout as cleared
      const { error: payoutErr } = await db
        .from('payouts')
        .update({ 
          status: 'paid',
          notes: payout.notes?.replace('(Clears in 48h)', '(Cleared)') 
        })
        .eq('id', payout.id);

      if (payoutErr) throw new Error(`Payout ${payout.id} upate err: ${payoutErr.message}`);

      // 3. Move funds in wallets
      const { data: wallet } = await db
        .from('wallets')
        .select('pending_balance, available_balance')
        .eq('user_id', payout.user_id)
        .single();
        
      if (wallet) {
        await db.from('wallets').update({
          pending_balance: Math.max(0, (wallet.pending_balance ?? 0) - payout.amount),
          available_balance: (wallet.available_balance ?? 0) + payout.amount
        }).eq('user_id', payout.user_id);
      }

      // 4. Move funds in influencers profile
      const { data: influencer } = await db
        .from('influencers')
        .select('id, pending_balance, available_balance')
        .eq('user_id', payout.user_id)
        .single();
        
      if (influencer) {
        await db.from('influencers').update({
          pending_balance: Math.max(0, (influencer.pending_balance ?? 0) - payout.amount),
          available_balance: (influencer.available_balance ?? 0) + payout.amount
        }).eq('id', influencer.id);
      }

      released++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      console.error(`[Clear Payouts] Error: ${msg}`);
    }
  }

  return { released, errors };
}
