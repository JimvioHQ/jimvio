/**
 * lib/payments/tx-ref.ts
 *
 * Utilities for generating robust, collision-resistant transaction references
 * and idempotency keys for production environments.
 */

/**
 * Generates a highly unique, easily identifiable transaction reference.
 * The format ensures time-based sorting and extreme collision resistance.
 *
 * Format: {PREFIX}_{TIMESTAMP_BASE36}_{RANDOM_HEX}
 * Example: TX_LWQ9K2X5_4A8B9C2D
 *
 * @param prefix An optional string prefix (defaults to "TX"). Keep it short (2-5 chars).
 */
export function generateTxRef(prefix: string = "TX"): string {
  // Base36 timestamp is shorter and URL-safe
  const timestamp = Date.now().toString(36).toUpperCase();
  
  // 8 random hex characters from crypto API
  const randomHex = crypto.randomUUID().split("-")[0].toUpperCase();
  
  const cleanPrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  return `${cleanPrefix}_${timestamp}_${randomHex}`;
}

/**
 * Normalizes and generates an idempotency key for webhook events.
 * 
 * @param provider The payment provider (e.g., 'flutterwave', 'pawapay', 'stripe')
 * @param identifier The unique transaction ID or reference from the provider
 */
export function generateIdempotencyKey(provider: string, identifier: string | number): string {
  const cleanProvider = provider.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanIdentifier = String(identifier).trim().toLowerCase();
  
  return `${cleanProvider}_${cleanIdentifier}`;
}
