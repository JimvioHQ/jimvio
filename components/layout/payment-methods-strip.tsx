import { memo, type ReactNode } from "react";
import { Landmark } from "lucide-react";
import { BRAND_MARKS, type BrandMark } from "@/lib/brand/payment-marks";
import { PAYMENT_METHOD_GROUPS, type PaymentMethodGroupId } from "@/lib/brand/payment-partners";
import { cn } from "@/lib/utils";

/** One official brand mark, sized by height; width follows its own shape. */
function Mark({ mark, className }: { mark: BrandMark; className?: string }) {
  const [, , w, h] = mark.viewBox.split(" ").map(Number);
  return (
    <svg
      viewBox={mark.viewBox}
      role="img"
      aria-label={mark.title}
      className={cn("block shrink-0", className)}
      style={{ aspectRatio: `${w} / ${h}` }}
      fill={mark.hex}
    >
      <path d={mark.path} />
    </svg>
  );
}

/** Mastercard's two-circle mark (official colours). */
function MastercardMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 38 24" role="img" aria-label="Mastercard" className={cn("block shrink-0", className)} style={{ aspectRatio: "38 / 24" }}>
      <circle cx="12" cy="12" r="12" fill="#EB001B" />
      <circle cx="26" cy="12" r="12" fill="#F79E1B" />
      <path d="M19 2.25a11.97 11.97 0 0 1 0 19.5 11.97 11.97 0 0 1 0-19.5z" fill="#FF5F00" />
    </svg>
  );
}

/** Generic mobile-money mark: phone with wallet — not a single carrier's logo. */
function MobileMoneyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Mobile money" className={cn("block shrink-0", className)} fill="none" stroke="#F26722" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="12" height="20" rx="2.2" />
      <path d="M8 18.5h4" />
      <rect x="10.5" y="8" width="10" height="7" rx="1.6" fill="#FFF4EC" />
      <circle cx="17.6" cy="11.5" r="0.9" fill="#F26722" stroke="none" />
    </svg>
  );
}

const MARKS: Record<PaymentMethodGroupId, ReactNode> = {
  cards: (
    <span className="grid grid-cols-2 items-center justify-items-center gap-x-1 gap-y-0.5 sm:flex sm:gap-1.5">
      <Mark mark={BRAND_MARKS.visa} className="h-[7px] sm:h-[11px]" />
      <MastercardMark className="h-[10px] sm:h-[15px]" />
      <Mark mark={BRAND_MARKS.amex} className="h-[11px] sm:h-[16px]" />
      <Mark mark={BRAND_MARKS.discover} className="h-[3.5px] sm:h-[6px]" />
    </span>
  ),
  bank: <Landmark aria-label="Bank transfer" className="h-[16px] w-[16px] text-[#1F2937] sm:h-[18px] sm:w-[18px]" strokeWidth={1.9} />,
  "mobile-money": <MobileMoneyMark className="h-[17px] w-[17px] sm:h-[20px] sm:w-[20px]" />,
  binance: (
    <span className="flex items-center gap-1">
      <Mark mark={BRAND_MARKS.binance} className="h-[15px] sm:h-[15px]" />
      <span className="hidden text-[11px] font-extrabold tracking-[0.04em] text-[#F0B90B] lg:inline">BINANCE</span>
    </span>
  ),
  crypto: (
    <span className="flex items-center gap-0.5 sm:gap-1.5">
      <Mark mark={BRAND_MARKS.bitcoin} className="h-[12px] sm:h-[16px]" />
      <Mark mark={BRAND_MARKS.ethereum} className="h-[12px] sm:h-[16px]" />
      <Mark mark={BRAND_MARKS.tether} className="h-[11px] sm:h-[15px]" />
    </span>
  ),
  "apple-pay": <Mark mark={BRAND_MARKS.applepay} className="h-[17px] sm:h-[22px]" />,
};

/**
 * "Pay and get paid with" — payment methods Jimvio checkout and payouts run
 * on (see PAYMENT_METHOD_GROUPS for where each is integrated). One row on
 * every screen size; logos are kept small.
 */
export const PaymentMethodsStrip = memo(function PaymentMethodsStrip() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl px-4 sm:px-6">
      <p className="mb-3 text-center text-[12px] font-medium tracking-[-0.01em] text-[var(--color-text-muted)] sm:mb-4 sm:text-[13px]">
        Pay and get paid with
      </p>
      <ul
        className="grid list-none grid-cols-6 items-start gap-1.5 p-0 sm:flex sm:items-start sm:justify-center sm:gap-0"
        aria-label="Supported payment methods"
      >
        {PAYMENT_METHOD_GROUPS.map((group, i) => (
          <li key={group.id} className="flex min-w-0 items-start sm:contents">
            {i > 0 ? (
              <span aria-hidden className="mx-3 mt-2.5 hidden h-6 w-px shrink-0 bg-[var(--color-border)] sm:block lg:mx-4" />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 sm:flex-none">
              <span
                className="flex h-9 w-full items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-1 shadow-[0_1px_2px_rgba(17,24,39,0.04)] sm:h-11 sm:w-auto sm:min-w-[64px] sm:rounded-xl sm:px-3"
                title={group.label}
              >
                {MARKS[group.id]}
              </span>
              <span className="w-full text-center text-[9px] font-medium leading-tight text-[var(--color-text-secondary)] sm:whitespace-nowrap sm:text-[11px]">
                {group.label}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
});
