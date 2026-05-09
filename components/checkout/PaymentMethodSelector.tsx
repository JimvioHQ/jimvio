
// "use client";

// import React from "react";
// import { CreditCard, Bitcoin, Smartphone, Globe, Gift, Wallet } from "lucide-react";
// import { cn } from "@/lib/utils";

// const pillBase: React.CSSProperties = {
//   display: "inline-flex", alignItems: "center", justifyContent: "center",
//   height: 22, minWidth: 36, padding: "0 6px", borderRadius: 5,
//   fontSize: 10, fontWeight: 700, flexShrink: 0, overflow: "hidden",
// };

// function Visa() {
//   return (
//     <span style={{ ...pillBase, background: "#1A1F71", color: "#fff" }}>VISA</span>
//   );
// }

// function Mastercard() {
//   return (
//     <span style={{ ...pillBase, background: "#111", padding: "0 4px", minWidth: 36 }}>
//       <svg width="30" height="18" viewBox="0 0 52 33">
//         <circle cx="18" cy="16.5" r="15" fill="#EB001B" />
//         <circle cx="34" cy="16.5" r="15" fill="#F79E1B" />
//         <path d="M26 5a15 15 0 010 23A15 15 0 0126 5z" fill="#FF5F00" />
//       </svg>
//     </span>
//   );
// }

// function ApplePay() {
//   return (
//     <span style={{ ...pillBase, background: "#000", color: "#fff", minWidth: 48 }}>
//       &#63743;&nbsp;Pay
//     </span>
//   );
// }

// function GooglePay() {
//   return (
//     <span style={{ ...pillBase, minWidth: 52, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)" }}>
//       <span style={{ color: "#4285F4", fontWeight: 800 }}>G</span>
//       <span style={{ color: "var(--color-text-secondary)", fontWeight: 600, marginLeft: 1 }}>Pay</span>
//     </span>
//   );
// }

// function MTN() {
//   return <span style={{ ...pillBase, background: "#FFCC00", color: "#000" }}>MTN</span>;
// }

// function Airtel() {
//   return <span style={{ ...pillBase, background: "#E60000", color: "#fff", fontStyle: "italic" }}>airtel</span>;
// }

// function MoMo() {
//   return <span style={{ ...pillBase, background: "#000", color: "#FFCC00" }}>MoMo</span>;
// }

// function BTC() {
//   return <span style={{ ...pillBase, background: "#F7931A", color: "#fff" }}>BTC</span>;
// }

// function ETH() {
//   return <span style={{ ...pillBase, background: "#627EEA", color: "#fff" }}>ETH</span>;
// }

// function USDT() {
//   return <span style={{ ...pillBase, background: "#26A17B", color: "#fff" }}>USDT</span>;
// }

// function BNB() {
//   return <span style={{ ...pillBase, background: "#F3BA2F", color: "#000" }}>BNB</span>;
// }

// function PayPalBrand() {
//   return (
//     <span style={{ ...pillBase, minWidth: 56, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", gap: 1 }}>
//       <span style={{ color: "#003087", fontWeight: 800 }}>Pay</span>
//       <span style={{ color: "#009CDE", fontWeight: 800 }}>Pal</span>
//     </span>
//   );
// }

// /* ── Method definitions ────────────────────────────────────────────────────── */

// type MethodId = "pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay";

// interface MethodDef {
//   id: MethodId;
//   title: string;
//   description: string;
//   icon: React.ReactNode;
//   logos: React.ReactNode[];
// }

// const METHODS: MethodDef[] = [
//   {
//     id: "flutterwave",
//     title: "Card & digital wallets",
//     description: "Visa, Mastercard, Apple Pay, Google Pay",
//     icon: <Globe className="h-4 w-4" />,
//     logos: [<Visa key="v" />, <Mastercard key="mc" />, <ApplePay key="ap" />, <GooglePay key="gp" />],
//   },
//   {
//     id: "pesapal",
//     title: "Credit / debit card",
//     description: "Visa and Mastercard accepted",
//     icon: <CreditCard className="h-4 w-4" />,
//     logos: [<Visa key="v" />, <Mastercard key="mc" />],
//   },
//   {
//     id: "pawapay",
//     title: "Mobile money",
//     description: "MTN, Airtel, M-Pesa and more",
//     icon: <Smartphone className="h-4 w-4" />,
//     logos: [<MTN key="mtn" />, <Airtel key="air" />, <MoMo key="mm" />],
//   },
//   {
//     id: "nowpayments",
//     title: "Cryptocurrency",
//     description: "BTC, ETH, USDT, BNB and more",
//     icon: <Bitcoin className="h-4 w-4" />,
//     logos: [<BTC key="btc" />, <ETH key="eth" />, <USDT key="usdt" />, <BNB key="bnb" />],
//   },
//   {
//     id: "paypal",
//     title: "PayPal",
//     description: "Pay with your PayPal balance or card",
//     icon: <Wallet className="h-4 w-4" />,
//     logos: [<PayPalBrand key="pp" />],
//   },
// ];

// /* ── Component ─────────────────────────────────────────────────────────────── */

// interface PaymentMethodSelectorProps {
//   selected: MethodId | null;
//   onSelect: (m: MethodId) => void;
//   payCurrency: string;
//   onCurrencyChange: (c: string) => void;
//   orderCurrency: string;
//   orderTotal: number;
//   flutterwaveMethod: "card" | "momo";
//   onFlutterwaveMethodChange: (m: "card" | "momo") => void;
// }

// export function PaymentMethodSelector({
//   selected,
//   onSelect,
// }: PaymentMethodSelectorProps) {
//   return (
//     <div className="space-y-2">
//       {METHODS.map((m) => {
//         const active = selected === m.id;
//         return (
//           <button
//             key={m.id}
//             type="button"
//             onClick={() => onSelect(m.id)}
//             className={cn(
//               "relative w-full text-left transition-all duration-200 active:scale-[0.99]",
//               "rounded-sm overflow-hidden border",
//               active
//                 ? "bg-orange-500/[0.04] border-orange-500/40 dark:bg-orange-500/[0.08]"
//                 : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
//             )}
//           >
//             {/* Active accent line */}
//             {active && (
//               <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
//             )}

//             <div className="flex items-center gap-3 px-4 py-3">

//               {/* Method icon */}
//               <div className={cn(
//                 "flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border transition-colors",
//                 active
//                   ? "bg-orange-500/10 border-orange-500/25 text-orange-500"
//                   : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]"
//               )}>
//                 {m.icon}
//               </div>

//               {/* Title + logos */}
//               <div className="flex-1 min-w-0">
//                 <p className={cn(
//                   "text-[13px] font-semibold leading-none mb-2",
//                   active ? "text-orange-600 dark:text-orange-500" : "text-[var(--color-text-primary)]"
//                 )}>
//                   {m.title}
//                 </p>
//                 <div className="flex items-center gap-1.5 flex-wrap">
//                   {m.logos}
//                 </div>
//               </div>

//               {/* Checkmark */}
//               <div className={cn(
//                 "flex-shrink-0 w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all duration-200",
//                 active
//                   ? "bg-orange-500 border-orange-500"
//                   : "bg-transparent border-[var(--color-border-strong)]"
//               )}>
//                 {active && (
//                   <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
//                     <path d="M1 3.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
//                   </svg>
//                 )}
//               </div>
//             </div>
//           </button>
//         );
//       })}
//     </div>
//   );
// }

"use client";

import React from "react";
import {
  CreditCard,
  Smartphone,
  Bitcoin,
  Wallet,
  Globe,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Logo pills ───────────────────────────────────────────────────────────────

const pillBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 20,
  minWidth: 30,
  padding: "0 5px",
  borderRadius: 4,
  fontSize: 9.5,
  fontWeight: 700,
  flexShrink: 0,
};

function Visa() {
  return <span style={{ ...pillBase, background: "#1A1F71", color: "#fff" }}>VISA</span>;
}

function Mastercard() {
  return (
    <span style={{ ...pillBase, background: "#111", padding: "0 3px", minWidth: 36 }}>
      <svg width="28" height="17" viewBox="0 0 52 33">
        <circle cx="18" cy="16.5" r="15" fill="#EB001B" />
        <circle cx="34" cy="16.5" r="15" fill="#F79E1B" />
        <path d="M26 5a15 15 0 010 23A15 15 0 0126 5z" fill="#FF5F00" />
      </svg>
    </span>
  );
}

function ApplePay() {
  return (
    <span style={{ ...pillBase, background: "#000", color: "#fff", minWidth: 46 }}>
      &#63743;&nbsp;Pay
    </span>
  );
}

function GooglePay() {
  return (
    <span
      style={{
        ...pillBase,
        minWidth: 42,
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-secondary)",
      }}
    >
      <span style={{ color: "#4285F4", fontWeight: 700 }}>G</span>
      <span style={{ color: "var(--color-text-secondary)", marginLeft: 1 }}>Pay</span>
    </span>
  );
}

function MTN() {
  return <span style={{ ...pillBase, background: "#FFCC00", color: "#000" }}>MTN</span>;
}

function Airtel() {
  return (
    <span style={{ ...pillBase, background: "#E60000", color: "#fff", fontStyle: "italic" }}>
      airtel
    </span>
  );
}

function MoMo() {
  return <span style={{ ...pillBase, background: "#000", color: "#FFCC00" }}>MoMo</span>;
}

function BTC() {
  return <span style={{ ...pillBase, background: "#F7931A", color: "#fff" }}>BTC</span>;
}

function ETH() {
  return <span style={{ ...pillBase, background: "#627EEA", color: "#fff" }}>ETH</span>;
}

function USDT() {
  return <span style={{ ...pillBase, background: "#26A17B", color: "#fff" }}>USDT</span>;
}

function BNB() {
  return <span style={{ ...pillBase, background: "#F3BA2F", color: "#000" }}>BNB</span>;
}

function PayPalBrand() {
  return (
    <span
      style={{
        ...pillBase,
        minWidth: 50,
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-secondary)",
        gap: 1,
      }}
    >
      <span style={{ color: "#003087", fontWeight: 800 }}>Pay</span>
      <span style={{ color: "#009CDE", fontWeight: 800 }}>Pal</span>
    </span>
  );
}

// ─── Method definitions ───────────────────────────────────────────────────────

export type MethodId = "pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay";

interface MethodDef {
  id: MethodId;
  title: string;
  description: string;
  icon: React.ReactNode;
  logos: React.ReactNode[];
  recommended?: boolean;
  /** Display string for the fee, e.g. "Free" or "+2.9%" */
  feeLabel: string;
  /** Numeric fee amount in RWF for a given order total — computed externally */
  feeAmount?: number;
}

const METHODS: MethodDef[] = [
  {
    id: "flutterwave",
    title: "Card & digital wallets",
    description: "Visa, Mastercard, Apple Pay, Google Pay",
    icon: <Globe className="h-[17px] w-[17px]" />,
    logos: [
      <Visa key="v" />,
      <Mastercard key="mc" />,
      <ApplePay key="ap" />,
      <GooglePay key="gp" />,
    ],
    recommended: true,
    feeLabel: "Free",
  },
  {
    id: "pesapal",
    title: "Credit / debit card",
    description: "Visa and Mastercard, 3D Secure enabled",
    icon: <CreditCard className="h-[17px] w-[17px]" />,
    logos: [<Visa key="v" />, <Mastercard key="mc" />],
    feeLabel: "Free",
  },
  {
    id: "pawapay",
    title: "Mobile money",
    description: "MTN, Airtel, M-Pesa and more",
    icon: <Smartphone className="h-[17px] w-[17px]" />,
    logos: [<MTN key="mtn" />, <Airtel key="air" />, <MoMo key="mm" />],
    feeLabel: "Free",
  },
  {
    id: "nowpayments",
    title: "Cryptocurrency",
    description: "BTC, ETH, USDT, BNB and 50+ coins",
    icon: <Bitcoin className="h-[17px] w-[17px]" />,
    logos: [<BTC key="btc" />, <ETH key="eth" />, <USDT key="usdt" />, <BNB key="bnb" />],
    feeLabel: "+1%",
  },
  {
    id: "paypal",
    title: "PayPal",
    description: "Pay with PayPal balance, card, or Pay Later",
    icon: <Wallet className="h-[17px] w-[17px]" />,
    logos: [<PayPalBrand key="pp" />],
    feeLabel: "+2.9%",
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaymentMethodSelectorProps {
  selected: MethodId | null;
  onSelect: (m: MethodId) => void;
  /** Order total in RWF — used to display fee amounts in the summary */
  orderTotal?: number;
  orderCurrency?: string;
  /** Show the order summary + pay button below the method list */
  showSummary?: boolean;
  onPay?: () => void;
  loading?: boolean;
}

// ─── Fee calculator ───────────────────────────────────────────────────────────

function calcFeeAmount(methodId: MethodId, total: number): number {
  if (methodId === "nowpayments") return Math.round(total * 0.01);
  if (methodId === "paypal") return Math.round(total * 0.029);
  return 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentMethodSelector({
  selected,
  onSelect,
  orderTotal = 0,
  orderCurrency = "RWF",
  showSummary = true,
  onPay,
  loading = false,
}: PaymentMethodSelectorProps) {
  const selectedMethod = METHODS.find((m) => m.id === selected);
  const feeAmount = selected ? calcFeeAmount(selected, orderTotal) : 0;
  const grandTotal = orderTotal + feeAmount;

  return (
    <div className="space-y-2">

      {/* ── Method list ───────────────────────────────────────────── */}
      <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-[var(--color-text-tertiary)] mb-3 px-0.5">
        Choose how to pay
      </p>

      <div className="space-y-1.5">
        {METHODS.map((m) => {
          const active = selected === m.id;
          const fee = calcFeeAmount(m.id, orderTotal);

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m.id)}
              className={cn(
                "relative w-full text-left transition-all duration-150 active:scale-[0.995]",
                "rounded-xl overflow-hidden border",
                active
                  ? "bg-orange-500/[0.03] border-orange-500/40 dark:bg-orange-500/[0.06]"
                  : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
              )}
            >
              {/* Top accent line */}
              {active && (
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/55 to-transparent" />
              )}

              <div className="flex items-center gap-3 px-3.5 py-3">

                {/* Icon */}
                <div
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center w-[38px] h-[38px] rounded-[10px] border transition-colors",
                    active
                      ? "bg-orange-500/10 border-orange-500/25 text-orange-500"
                      : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                  )}
                >
                  {m.icon}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  {/* Title + recommended badge */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <p
                      className={cn(
                        "text-[13px] font-medium leading-none",
                        active
                          ? "text-orange-600 dark:text-orange-500"
                          : "text-[var(--color-text-primary)]"
                      )}
                    >
                      {m.title}
                    </p>
                    {m.recommended && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 leading-none">
                        Recommended
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-[11.5px] text-[var(--color-text-secondary)] leading-snug mb-1.5">
                    {m.description}
                  </p>

                  {/* Logos + fee */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {m.logos}
                    {fee > 0 && (
                      <span className="text-[10px] text-[var(--color-text-tertiary)] ml-0.5">
                        {m.feeLabel} fee
                      </span>
                    )}
                  </div>
                </div>

                {/* Radio button */}
                <div
                  className={cn(
                    "flex-shrink-0 w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-all duration-150",
                    active
                      ? "bg-orange-500 border-orange-500"
                      : "bg-transparent border-[var(--color-border-strong)]"
                  )}
                >
                  {active && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Order summary ──────────────────────────────────────────── */}
      {showSummary && orderTotal > 0 && (
        <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-2">
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--color-text-secondary)]">Subtotal</span>
            <span className="font-medium text-[var(--color-text-primary)]">
              {orderCurrency} {orderTotal.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--color-text-secondary)]">Processing fee</span>
            <span
              className={cn(
                "font-medium",
                feeAmount === 0
                  ? "text-[var(--color-text-success,#16a34a)]"
                  : "text-[var(--color-text-primary)]"
              )}
            >
              {feeAmount === 0
                ? "Free"
                : `${orderCurrency} ${feeAmount.toLocaleString()} (${selectedMethod?.feeLabel})`}
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--color-border)] flex justify-between items-center">
            <span className="text-[13px] font-medium text-[var(--color-text-primary)]">Total</span>
            <span className="text-[15px] font-medium text-[var(--color-text-primary)]">
              {orderCurrency} {grandTotal.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* ── Pay button ────────────────────────────────────────────── */}
      {onPay && (
        <>
          <button
            type="button"
            onClick={onPay}
            disabled={!selected || loading}
            className={cn(
              "w-full mt-2 py-3 rounded-xl text-[14px] font-medium text-white transition-all duration-150",
              "bg-orange-600 hover:bg-orange-700 active:scale-[0.99]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading
              ? "Processing…"
              : selectedMethod
                ? `Pay with ${selectedMethod.title}`
                : "Select a payment method"}
          </button>

          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Lock className="h-3 w-3 text-[var(--color-text-tertiary)]" />
            <span className="text-[11px] text-[var(--color-text-tertiary)]">
              Secured by 256-bit SSL encryption
            </span>
          </div>
        </>
      )}
    </div>
  );
}