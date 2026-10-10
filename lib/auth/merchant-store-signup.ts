/**
 * Storefront registration may confirm a brand-new customer and continue
 * with a real Supabase session. Platform registration is unchanged.
 *
 * Only a user created by this signup (non-empty identities, no session yet)
 * is eligible. Existing accounts are never confirmed here.
 */
export function canConfirmFreshStoreSignup(input: {
  merchantContext: boolean;
  hasSession: boolean;
  duplicateUnconfirmed: boolean;
  hasUserId: boolean;
}): boolean {
  return (
    input.merchantContext &&
    !input.hasSession &&
    !input.duplicateUnconfirmed &&
    input.hasUserId
  );
}
