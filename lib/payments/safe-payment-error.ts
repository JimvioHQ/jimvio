/**
 * Map provider / database failures to customer-safe messages.
 * Never expose SQL, constraint names, stack traces, or secrets.
 */

const PROVIDER_START_MESSAGES: Record<string, string> = {
  flutterwave: "Flutterwave could not be started. Please try again.",
  mobile_money: "Mobile Money payment could not be started. Please try again.",
  nowpayments: "Cryptocurrency payment could not be started. Please try again.",
  crypto: "Cryptocurrency payment could not be started. Please try again.",
  binancepay: "Binance Pay could not be started. Please try again.",
  paypal: "PayPal could not be started. Please try again.",
  pesapal: "PesaPal could not be started. Please try again.",
  pawapay: "PawaPay could not be started. Please try again.",
};

const UNSAFE_PATTERNS = [
  /violates check constraint/i,
  /wallet_deposits/i,
  /relation ["']/i,
  /new row for relation/i,
  /duplicate key/i,
  /permission denied/i,
  /RLS/i,
  /api[_ -]?key/i,
  /secret/i,
  /stack/i,
  /at\s+\S+\s+\(/i,
  /BINANCE_PAY_/i,
  /NOWPAYMENTS_/i,
  /FLW_/i,
  /supabase/i,
  /postgres/i,
  /sql/i,
];

function looksUnsafe(message: string): boolean {
  return UNSAFE_PATTERNS.some((re) => re.test(message));
}

export function safeDepositInitiateError(
  method: string | null | undefined,
  err: unknown,
): string {
  const key = String(method ?? "")
    .trim()
    .toLowerCase();
  const fallback =
    PROVIDER_START_MESSAGES[key] ??
    "Could not start payment. Please try another method.";

  if (!(err instanceof Error) || !err.message?.trim()) return fallback;

  const msg = err.message.trim();
  if (looksUnsafe(msg)) return fallback;

  // Allow short, already customer-facing provider messages.
  if (msg.length <= 180 && !/[{\[]/.test(msg)) return msg;
  return fallback;
}

export function safeWalletMutationError(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!(err instanceof Error) || !err.message?.trim()) return fallback;
  const msg = err.message.trim();
  if (looksUnsafe(msg)) return fallback;
  if (msg.length <= 160 && !/[{\[]/.test(msg)) return msg;
  return fallback;
}

export function safeWithdrawalError(err: unknown): string {
  return safeWalletMutationError(
    err,
    "Withdrawal could not be submitted. Please try again.",
  );
}
