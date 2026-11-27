// "use client";

// import React, { useEffect, useState } from "react";
// import {
//   CreditCard,
//   Smartphone,
//   Bitcoin,
//   Wallet,
//   Globe,
//   Lock,
// } from "lucide-react";
// import { cn } from "@/lib/utils";

// // ─── Logo pills ───────────────────────────────────────────────────────────────

// const pillBase: React.CSSProperties = {
//   display: "inline-flex",
//   alignItems: "center",
//   justifyContent: "center",
//   height: 20,
//   minWidth: 30,
//   padding: "0 5px",
//   borderRadius: 4,
//   fontSize: 9.5,
//   fontWeight: 700,
//   flexShrink: 0,
// };

// function Visa() {
//   return <span style={{ ...pillBase, background: "#1A1F71", color: "#fff" }}>VISA</span>;
// }

// function Mastercard() {
//   return (
//     <span style={{ ...pillBase, background: "#111", padding: "0 3px", minWidth: 36 }}>
//       <svg width="28" height="17" viewBox="0 0 52 33">
//         <circle cx="18" cy="16.5" r="15" fill="#EB001B" />
//         <circle cx="34" cy="16.5" r="15" fill="#F79E1B" />
//         <path d="M26 5a15 15 0 010 23A15 15 0 0126 5z" fill="#FF5F00" />
//       </svg>
//     </span>
//   );
// }

// function ApplePay() {
//   return (
//     <span style={{ ...pillBase, background: "#000", color: "#fff", minWidth: 46 }}>
//       &#63743;&nbsp;Pay
//     </span>
//   );
// }

// function GooglePay() {
//   return (
//     <span
//       style={{
//         ...pillBase,
//         minWidth: 42,
//         background: "var(--color-background-primary)",
//         border: "0.5px solid var(--color-border-secondary)",
//       }}
//     >
//       <span style={{ color: "#4285F4", fontWeight: 700 }}>G</span>
//       <span style={{ color: "var(--color-text-secondary)", marginLeft: 1 }}>Pay</span>
//     </span>
//   );
// }

// function MTN() {
//   return <span style={{ ...pillBase, background: "#FFCC00", color: "#000" }}>MTN</span>;
// }

// function Airtel() {
//   return (
//     <span style={{ ...pillBase, background: "#E60000", color: "#fff", fontStyle: "italic" }}>
//       airtel
//     </span>
//   );
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
//     <span
//       style={{
//         ...pillBase,
//         minWidth: 50,
//         background: "var(--color-background-primary)",
//         border: "0.5px solid var(--color-border-secondary)",
//         gap: 1,
//       }}
//     >
//       <span style={{ color: "#003087", fontWeight: 800 }}>Pay</span>
//       <span style={{ color: "#009CDE", fontWeight: 800 }}>Pal</span>
//     </span>
//   );
// }

// // ─── Method definitions ───────────────────────────────────────────────────────

// export type MethodId = "pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay";

// interface MethodDef {
//   id: MethodId;
//   title: string;
//   description: string;
//   icon: React.ReactNode;
//   logos: React.ReactNode[];
//   recommended?: boolean;
//   /** Display string for the fee, e.g. "Free" or "+2.9%" */
//   feeLabel: string;
//   /** Numeric fee amount in RWF for a given order total — computed externally */
//   feeAmount?: number;
// }

// const METHODS: MethodDef[] = [
//   {
//     id: "flutterwave",
//     title: "Card & digital wallets",
//     description: "Visa, Mastercard, Apple Pay, Google Pay",
//     icon: <Globe className="h-[17px] w-[17px]" />,
//     logos: [
//       <Visa key="v" />,
//       <Mastercard key="mc" />,
//       <ApplePay key="ap" />,
//       <GooglePay key="gp" />,
//     ],
//     recommended: true,
//     feeLabel: "Free",
//   },
//   {
//     id: "pesapal",
//     title: "Credit / debit card",
//     description: "Visa and Mastercard, 3D Secure enabled",
//     icon: <CreditCard className="h-[17px] w-[17px]" />,
//     logos: [<Visa key="v" />, <Mastercard key="mc" />],
//     feeLabel: "Free",
//   },
//   {
//     id: "pawapay",
//     title: "Mobile money",
//     description: "MTN, Airtel, M-Pesa and more",
//     icon: <Smartphone className="h-[17px] w-[17px]" />,
//     logos: [<MTN key="mtn" />, <Airtel key="air" />, <MoMo key="mm" />],
//     feeLabel: "Free",
//   },
//   {
//     id: "nowpayments",
//     title: "Cryptocurrency",
//     description: "BTC, ETH, USDT, BNB and 50+ coins",
//     icon: <Bitcoin className="h-[17px] w-[17px]" />,
//     logos: [<BTC key="btc" />, <ETH key="eth" />, <USDT key="usdt" />, <BNB key="bnb" />],
//     feeLabel: "+1%",
//   },
//   {
//     id: "paypal",
//     title: "PayPal",
//     description: "Pay with PayPal balance, card, or Pay Later",
//     icon: <Wallet className="h-[17px] w-[17px]" />,
//     logos: [<PayPalBrand key="pp" />],
//     feeLabel: "+2.9%",
//   },
// ];

// // ─── Props ────────────────────────────────────────────────────────────────────

// interface PaymentMethodSelectorProps {
//   selected: MethodId | null;
//   onSelect: (m: MethodId) => void;
//   /** Order total in RWF — used to display fee amounts in the summary */
//   orderTotal?: number;
//   orderCurrency?: string;
//   /** Show the order summary + pay button below the method list */
//   showSummary?: boolean;
//   onPay?: () => void;
//   loading?: boolean;
// }

// // ─── Fee calculator ───────────────────────────────────────────────────────────

// function calcFeeAmount(methodId: MethodId, total: number): number {
//   if (methodId === "nowpayments") return Math.round(total * 0.01);
//   if (methodId === "paypal") return Math.round(total * 0.029);
//   return 0;
// }

// // ─── Component ────────────────────────────────────────────────────────────────

// export function PaymentMethodSelector({
//   selected,
//   onSelect,
//   orderTotal = 0,
//   orderCurrency = "RWF",
//   showSummary = true,
//   onPay,
//   loading = false,
// }: PaymentMethodSelectorProps) {
//   const selectedMethod = METHODS.find((m) => m.id === selected);
//   const feeAmount = selected ? calcFeeAmount(selected, orderTotal) : 0;
//   const grandTotal = orderTotal + feeAmount;

//   return (
//     <div className="space-y-2">

//       {/* ── Method list ───────────────────────────────────────────── */}
//       <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-[var(--color-text-tertiary)] mb-3 px-0.5">
//         Choose how to pay
//       </p>

//       <div className="space-y-1.5">
//         {METHODS.map((m) => {
//           const active = selected === m.id;
//           const fee = calcFeeAmount(m.id, orderTotal);

//           return (
//             <button
//               key={m.id}
//               type="button"
//               onClick={() => onSelect(m.id)}
//               className={cn(
//                 "relative w-full text-left transition-all duration-150 active:scale-[0.995]",
//                 "rounded-md overflow-hidden border",
//                 active
//                   ? "bg-orange-500/[0.03] border-orange-500/40 dark:bg-orange-500/[0.06]"
//                   : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
//               )}
//             >
//               {/* Top accent line */}
//               {active && (
//                 <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/55 to-transparent" />
//               )}

//               <div className="flex items-center gap-3 px-3.5 py-3">

//                 {/* Icon */}
//                 <div
//                   className={cn(
//                     "flex-shrink-0 flex items-center justify-center w-[38px] h-[38px] rounded-[10px] border transition-colors",
//                     active
//                       ? "bg-orange-500/10 border-orange-500/25 text-orange-500"
//                       : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]"
//                   )}
//                 >
//                   {m.icon}
//                 </div>

//                 {/* Body */}
//                 <div className="flex-1 min-w-0">
//                   {/* Title + recommended badge */}
//                   <div className="flex items-center gap-2 mb-1.5">
//                     <p
//                       className={cn(
//                         "text-[13px] font-medium leading-none",
//                         active
//                           ? "text-orange-600 dark:text-orange-500"
//                           : "text-[var(--color-text-primary)]"
//                       )}
//                     >
//                       {m.title}
//                     </p>
//                     {m.recommended && (
//                       <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 leading-none">
//                         Recommended
//                       </span>
//                     )}
//                   </div>

//                   {/* Description */}
//                   <p className="text-[11.5px] text-[var(--color-text-secondary)] leading-snug mb-1.5">
//                     {m.description}
//                   </p>

//                   {/* Logos + fee */}
//                   <div className="flex items-center gap-1.5 flex-wrap">
//                     {m.logos}
//                     {fee > 0 && (
//                       <span className="text-[10px] text-[var(--color-text-tertiary)] ml-0.5">
//                         {m.feeLabel} fee
//                       </span>
//                     )}
//                   </div>
//                 </div>

//                 {/* Radio button */}
//                 <div
//                   className={cn(
//                     "flex-shrink-0 w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-all duration-150",
//                     active
//                       ? "bg-orange-500 border-orange-500"
//                       : "bg-transparent border-[var(--color-border-strong)]"
//                   )}
//                 >
//                   {active && (
//                     <div className="w-1.5 h-1.5 rounded-full bg-white" />
//                   )}
//                 </div>
//               </div>
//             </button>
//           );
//         })}
//       </div>

//       {/* ── Order summary ──────────────────────────────────────────── */}
//       {showSummary && orderTotal > 0 && (
//         <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-2">
//           <div className="flex justify-between items-center text-[13px]">
//             <span className="text-[var(--color-text-secondary)]">Subtotal</span>
//             <span className="font-medium text-[var(--color-text-primary)]">
//               {orderCurrency} {orderTotal.toLocaleString()}
//             </span>
//           </div>

//           <div className="flex justify-between items-center text-[13px]">
//             <span className="text-[var(--color-text-secondary)]">Processing fee</span>
//             <span
//               className={cn(
//                 "font-medium",
//                 feeAmount === 0
//                   ? "text-[var(--color-text-success,#16a34a)]"
//                   : "text-[var(--color-text-primary)]"
//               )}
//             >
//               {feeAmount === 0
//                 ? "Free"
//                 : `${orderCurrency} ${feeAmount.toLocaleString()} (${selectedMethod?.feeLabel})`}
//             </span>
//           </div>

//           <div className="pt-2 border-t border-[var(--color-border)] flex justify-between items-center">
//             <span className="text-[13px] font-medium text-[var(--color-text-primary)]">Total</span>
//             <span className="text-[15px] font-medium text-[var(--color-text-primary)]">
//               {orderCurrency} {grandTotal.toLocaleString()}
//             </span>
//           </div>
//         </div>
//       )}

//       {/* ── Pay button ────────────────────────────────────────────── */}
//       {onPay && (
//         <>
//           <button
//             type="button"
//             onClick={onPay}
//             disabled={!selected || loading}
//             className={cn(
//               "w-full mt-2 py-3 rounded-xl text-[14px] font-medium text-white transition-all duration-150",
//               "bg-orange-600 hover:bg-orange-700 active:scale-[0.99]",
//               "disabled:opacity-50 disabled:cursor-not-allowed"
//             )}
//           >
//             {loading
//               ? "Processing…"
//               : selectedMethod
//                 ? `Pay with ${selectedMethod.title}`
//                 : "Select a payment method"}
//           </button>

//           <div className="flex items-center justify-center gap-1.5 mt-2">
//             <Lock className="h-3 w-3 text-[var(--color-text-tertiary)]" />
//             <span className="text-[11px] text-[var(--color-text-tertiary)]">
//               Secured by 256-bit SSL encryption
//             </span>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

"use client";

import React, { useEffect, useState } from "react";
import { Lock, ShieldCheck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Logo pills ───────────────────────────────────────────────────────────────

const CARD_BRANDS = [
  { src: "/logos/cards/discover.svg", name: "Discover" },
  { src: "/logos/cards/visa.svg", name: "Visa" },
  { src: "/logos/cards/amex.svg", name: "American Express" },
  { src: "/logos/cards/mastercard.svg", name: "Mastercard" },
  { src: "/logos/cards/verve.svg", name: "Verve" },
  { src: "/logos/cards/diners.svg", name: "Diners Club International" },
  { src: "/logos/cards/jcb.svg", name: "JCB" },
] as const;

function CardBrandLogo({ src, name }: { src: string; name: string }) {
  return (
    <img
      src={src}
      alt={name}
      width={38}
      height={24}
      className="h-[18px] w-auto max-w-[34px] shrink object-contain sm:h-[22px] sm:max-w-[40px]"
    />
  );
}

// Crypto coin icons — colored circles matching the screenshot
function BTCIcon() {
  return (
    <span style={{ display: "inline-flex", width: 22, height: 22, borderRadius: "50%", background: "#F7931A", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.328-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.655-1.95l.044-.002zm-2.95 4.135c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z" />
      </svg>
    </span>
  );
}

function ETHIcon() {
  return (
    <span style={{ display: "inline-flex", width: 22, height: 22, borderRadius: "50%", background: "#627EEA", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="10" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
      </svg>
    </span>
  );
}

function USDTIcon() {
  return (
    <span style={{ display: "inline-flex", width: 22, height: 22, borderRadius: "50%", background: "#26A17B", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 7, fontWeight: 800, color: "#fff" }}>
      USDT
    </span>
  );
}


function PartnerLogo({ domain, label, localSrc }: { domain: string; label: string; localSrc?: string }) {
  return (
    <img
      src={localSrc ?? `https://img.logokit.com/${domain}`}
      alt={label}
      className="h-[22px] max-h-[22px] w-auto object-contain object-center rounded-sm"
      onError={(event) => {
        const img = event.currentTarget;
        img.onerror = null;
        img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      }}
    />
  );
}

/** Uniform logo rail — same height, baseline, spacing on mobile and desktop */
function PaymentLogoRail({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        "[&_img]:h-[22px] [&_img]:max-h-[22px] [&_img]:w-auto [&_img]:object-contain [&_img]:object-center",
        "[&>span]:inline-flex [&>span]:h-[22px] [&>span]:max-h-[22px] [&>span]:items-center [&>span]:justify-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type MethodId =
  | "nowpayments"
  | "flutterwave"
  | "mobile_money"
  | "binancepay"
  | "wallet";

interface MethodDef {
  id: MethodId;
  title: string;
  description: string;
  iconNode: React.ReactNode;
  logos: React.ReactNode[];
  feeLabel: string;
}

const METHODS: MethodDef[] = [
  {
    id: "flutterwave",
    title: "Pay with Cards",
    description: "Secure checkout with Visa, Mastercard and supported cards",
    iconNode: (
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <rect x="2" y="5" width="20" height="14" rx="2" fill="white" fillOpacity="0.3" />
          <rect x="2" y="9" width="20" height="3" fill="white" fillOpacity="0.6" />
          <rect x="4" y="14" width="4" height="2" rx="0.5" fill="white" />
        </svg>
      </div>
    ),
    logos: CARD_BRANDS.map((brand) => (
      <CardBrandLogo key={brand.src} src={brand.src} name={brand.name} />
    )),
    feeLabel: "Free",
  },
  {
    id: "mobile_money",
    title: "Mobile Money",
    description: "Pay securely with your local mobile wallet",
    iconNode: (
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "linear-gradient(135deg, #FFCC00 0%, #F5A623 100%)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="2" width="14" height="20" rx="2" fill="#111" fillOpacity="0.85" />
          <rect x="8" y="18" width="8" height="2" rx="1" fill="#FFCC00" />
        </svg>
      </div>
    ),
    // Providers are shown on the dedicated Mobile Money step — never inline here.
    logos: [],
    feeLabel: "Free",
  },
  {
    id: "nowpayments",
    title: "Cryptocurrency",
    description: "Pay with BTC, ETH, USDT and more",
    iconNode: (
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "#F7931A",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.328-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.655-1.95l.044-.002zm-2.95 4.135c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z" />
        </svg>
      </div>
    ),
    logos: [
      <BTCIcon key="btc" />,
      <ETHIcon key="eth" />,
      <USDTIcon key="usdt" />,
    ],
    feeLabel: "+1%",
  },
  {
    id: "binancepay",
    title: "Binance Pay",
    description: "Pay securely with Binance",
    iconNode: (
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "#F3BA2F",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <img src="/logos/idF7XAjt3f.png" alt="Binance" style={{ width: 22, height: 22, objectFit: "contain" }} />
      </div>
    ),
    logos: [<PartnerLogo key="bp" domain="binance.com" label="Binance Pay" localSrc="/logos/binance.png" />],
    feeLabel: "Free",
  },
  {
    id: "wallet",
    title: "Jimvio Wallet",
    description: "Pay instantly using your available Jimvio Wallet balance",
    iconNode: (
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Wallet className="h-5 w-5 text-white" />
      </div>
    ),
    logos: [],
    feeLabel: "Free",
  },
];
// ─── Trust badge component ────────────────────────────────────────────────────

function TrustBadge({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold leading-tight text-[var(--color-text-primary)]">{title}</p>
        <p className="mt-0.5 text-[10px] leading-tight text-[var(--color-text-muted)]">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaymentMethodSelectorProps {
  selected: MethodId | null;
  onSelect: (m: MethodId) => void;
  orderTotal?: number;
  orderCurrency?: string;
  showSummary?: boolean;
  onPay?: () => void;
  loading?: boolean;
  /** When set, only these providers are shown (from Admin → Payments settings). */
  enabledMethodIds?: MethodId[];
}

function calcFeeAmount(methodId: MethodId, total: number): number {
  if (methodId === "nowpayments") return Math.round(total * 0.01);
  return 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentMethodSelector({
  selected,
  onSelect,
  orderTotal = 0,
  orderCurrency = "USD",
  showSummary = true,
  onPay,
  loading = false,
  enabledMethodIds,
}: PaymentMethodSelectorProps) {
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletBalanceCurrency, setWalletBalanceCurrency] = useState("USD");

  useEffect(() => {
    let active = true;
    fetch("/api/wallet/os/overview", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { overview?: { available?: number; currency?: string } } | null) => {
        if (!active || !data?.overview) return;
        const balance = Number(data.overview.available);
        if (Number.isFinite(balance)) setWalletBalance(balance);
        if (typeof data.overview.currency === "string") setWalletBalanceCurrency(data.overview.currency);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const visibleMethods = enabledMethodIds?.length
    ? METHODS.filter((m) => enabledMethodIds.includes(m.id))
    : METHODS;
  const selectedMethod = visibleMethods.find((m) => m.id === selected) ?? METHODS.find((m) => m.id === selected);
  const feeAmount = selected ? calcFeeAmount(selected, orderTotal) : 0;
  const grandTotal = orderTotal + feeAmount;

  if (enabledMethodIds && enabledMethodIds.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-5 text-sm text-[var(--color-text-secondary)]">
        Online payment is currently unavailable for this store.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-lg:space-y-3">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-1 max-lg:mb-2">
        <h2 className="text-[18px] font-bold text-[var(--color-text-primary)] tracking-tight max-lg:text-[20px]">
          Choose your payment method
        </h2>
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5 max-lg:text-[13px]">
          All transactions are secure and encrypted
        </p>
      </div>

      {/* ── Method list ───────────────────────────────────────────────── */}
      <div className="space-y-2 max-lg:space-y-3">
        {visibleMethods.map((m) => {
          const active = selected === m.id;
          const fee = calcFeeAmount(m.id, orderTotal);

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m.id)}
              className={cn(
                "relative w-full text-left transition-[transform,border-color,background-color,box-shadow] duration-200",
                "rounded-xl overflow-hidden border active:scale-[0.99]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-2",
                "max-lg:rounded-2xl",
                !active && "lg:hover:scale-[1.005]",
                active
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]/40 shadow-[0_8px_24px_rgba(253,80,0,0.08)] ring-1 ring-[var(--color-accent)]/25 max-lg:shadow-[0_6px_22px_rgba(253,80,0,0.12)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] max-lg:shadow-[0_2px_10px_rgba(0,0,0,0.04)]",
              )}
            >
              <div className="flex items-start gap-3 px-4 py-3.5 max-lg:gap-3.5 max-lg:p-4 lg:items-center lg:gap-4">

                {/* Large icon — colored circle */}
                <div className="shrink-0 max-lg:mt-0.5">{m.iconNode}</div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-[14px] font-bold leading-none max-lg:text-[15px]">
                      {m.title}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-[12px] text-[var(--color-text-secondary)] leading-snug mb-2 max-lg:text-[13px] max-lg:leading-relaxed">
                    {m.description}
                  </p>

                  {m.id === "mobile_money" && (
                    <p className="text-[11px] text-[var(--color-text-muted)] mb-1.5">
                      Continue to a secure Mobile Money checkout
                    </p>
                  )}
                  {m.id === "wallet" && (
                    <p className="text-[11px] font-medium text-[var(--color-text-secondary)] mb-1.5">
                      {walletBalance === null
                        ? "Loading available balance…"
                        : `Available balance: ${new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: walletBalanceCurrency,
                            maximumFractionDigits: 2,
                          }).format(walletBalance)}`}
                    </p>
                  )}

                  {/* Payment logos row - only for non-crypto methods with logos */}
                  {m.id !== "nowpayments" && m.id !== "binancepay" && m.logos.length > 0 && (
                    <PaymentLogoRail className="max-w-full !flex-nowrap gap-1 overflow-x-auto [scrollbar-width:none] sm:gap-1.5">
                      {m.logos}
                      {fee > 0 && (
                        <span className="text-[10px] text-[var(--color-text-secondary)] ml-0.5 bg-[var(--color-background-secondary)] border border-[var(--color-border-tertiary)] px-1.5 py-0.5 rounded whitespace-nowrap">
                          {m.feeLabel} fee
                        </span>
                      )}
                    </PaymentLogoRail>
                  )}

                  {(m.id === "nowpayments" || m.id === "binancepay") && (
                    <PaymentLogoRail className="mt-2 lg:hidden">
                      {m.logos}
                      {fee > 0 && (
                        <span className="text-[10px] text-[var(--color-text-secondary)] bg-[var(--color-background-secondary)] border border-[var(--color-border-tertiary)] px-1.5 py-0.5 rounded whitespace-nowrap">
                          {m.feeLabel} fee
                        </span>
                      )}
                    </PaymentLogoRail>
                  )}
                </div>

                {/* Right side - logos for crypto and binance pay (desktop) */}
                {(m.id === "nowpayments" || m.id === "binancepay") && (
                  <div className="hidden shrink-0 items-center lg:flex">
                    <PaymentLogoRail>{m.logos}</PaymentLogoRail>
                  </div>
                )}

                {/* Right side - fee badge and radio button */}
                <div className="flex-shrink-0 flex items-center gap-2 max-lg:mt-1">
                  {fee > 0 && m.id !== "flutterwave" && (
                    <span className="text-[10px] text-[var(--color-text-secondary)] bg-[var(--color-background-secondary)] border border-[var(--color-border-tertiary)] px-1.5 py-0.5 rounded whitespace-nowrap max-lg:hidden">
                      {m.feeLabel} fee
                    </span>
                  )}
                  {/* Radio button — right side */}
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150 max-lg:h-7 max-lg:w-7",
                    active
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                      : "border-[var(--color-border)] bg-transparent",
                  )}>
                    {active && (
                      <div className="h-2 w-2 rounded-full bg-white max-lg:h-2.5 max-lg:w-2.5" />
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Active partners strip (only methods actually available) ── */}
      {visibleMethods.length > 0 ? (
        <div className="flex flex-col items-center gap-3 pt-3 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Secure payment partners
          </span>
          <div className="flex flex-wrap items-center justify-center gap-5">
            {visibleMethods.some((m) => m.id === "flutterwave" || m.id === "mobile_money") ? (
              <img
                src="/logos/flutterwave.png"
                alt="Flutterwave"
                className="h-5 w-auto object-contain"
              />
            ) : null}
            {visibleMethods.some((m) => m.id === "nowpayments") ? (
              <img
                src="/logos/NOWPayments_idKVr3HnXR_1.svg"
                alt="NOWPayments"
                className="h-5 w-auto object-contain"
              />
            ) : null}
            {visibleMethods.some((m) => m.id === "binancepay") ? (
              <img
                src="/logos/binance.png"
                alt="Binance Pay"
                className="h-5 w-auto object-contain"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── Order summary ──────────────────────────────────────────── */}
      {showSummary && orderTotal > 0 && (
        <div className="rounded-xl border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] p-4 space-y-2">
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--color-text-secondary)]">Subtotal</span>
            <span className="font-semibold text-[var(--color-text-primary)]">
              {orderCurrency} {orderTotal.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--color-text-secondary)]">Processing fee</span>
            <span className={cn(
              "font-semibold",
              feeAmount === 0 ? "text-green-600" : "text-[var(--color-text-primary)]"
            )}>
              {feeAmount === 0
                ? "Free"
                : `${orderCurrency} ${feeAmount.toLocaleString()} (${selectedMethod?.feeLabel})`}
            </span>
          </div>
          <div className="pt-2 border-t border-[var(--color-border-tertiary)] flex justify-between items-center">
            <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">Total</span>
            <span className="text-[16px] font-bold text-[var(--color-text-primary)]">
              {orderCurrency} {grandTotal.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* ── Pay button ────────────────────────────────────────────── */}
      {onPay && (
        <button
          type="button"
          onClick={onPay}
          disabled={!selected || loading}
          className={cn(
            "w-full mt-1 py-3.5 rounded-sm text-[15px] font-bold text-white transition-all duration-150",
            "flex items-center justify-center gap-2",
            "bg-orange-500 hover:bg-orange-600 active:scale-[0.99]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {loading ? (
            "Processing…"
          ) : (
            <>
              <Lock className="h-4 w-4" />
              {selectedMethod
                ? `Complete Secure Payment`
                : "Select a payment method"}
            </>
          )}
        </button>
      )}

      {/* ── Trust badges ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <TrustBadge
          icon={<Lock className="h-3.5 w-3.5 text-green-600" />}
          title="SSL Secure"
          subtitle="256-bit encryption"
        />
        <TrustBadge
          icon={<ShieldCheck className="h-3.5 w-3.5 text-green-600" />}
          title="PCI DSS Compliant"
          subtitle="Secure payments"
        />
        <TrustBadge
          icon={
            <svg className="h-3.5 w-3.5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
          title="Fraud Protection"
          subtitle="Your payments are safe"
        />
        <TrustBadge
          icon={
            <svg className="h-3.5 w-3.5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          }
          title="Encrypted Payments"
          subtitle="Bank-level security"
        />
      </div>

    </div>
  );
}