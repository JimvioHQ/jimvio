import { rwfToUsdAmount, usdToRwfAmount } from "@/lib/money";

const AMOUNT_EPS = 0.009;

/**
 * Confirms a provider-paid amount covers the escrow intent.
 * Same-currency: paid must meet expected.
 * USD vs RWF: use stored invoice totals when present, else the shared RWF_TO_USD_RATE helpers.
 * Missing paid amount/currency keeps fail-open (legacy callbacks that already verified upstream).
 * Unknown cross-currency pairs fail closed.
 */
export function paidAmountCoversEscrow(input: {
  expected: number;
  escrowCurrency: string;
  paidAmount?: number | null;
  paidCurrency?: string | null;
  invoiceAmount?: number | null;
  invoiceCurrency?: string | null;
}): boolean {
  if (input.paidAmount == null || !Number.isFinite(Number(input.paidAmount))) {
    return true;
  }
  const paid = Number(input.paidAmount);
  const paidCur = String(input.paidCurrency ?? "").trim().toUpperCase();
  const escrowCur = String(input.escrowCurrency ?? "RWF").trim().toUpperCase();
  if (!paidCur) return true;

  if (paidCur === escrowCur) {
    return paid + AMOUNT_EPS >= Number(input.expected);
  }

  const invoiceCur = String(input.invoiceCurrency ?? "").trim().toUpperCase();
  if (
    invoiceCur &&
    invoiceCur === paidCur &&
    input.invoiceAmount != null &&
    Number.isFinite(Number(input.invoiceAmount))
  ) {
    return paid + AMOUNT_EPS >= Number(input.invoiceAmount);
  }

  if (paidCur === "USD" && escrowCur === "RWF") {
    return paid + AMOUNT_EPS >= rwfToUsdAmount(Number(input.expected));
  }
  if (paidCur === "RWF" && escrowCur === "USD") {
    return paid + AMOUNT_EPS >= usdToRwfAmount(Number(input.expected));
  }

  return false;
}
