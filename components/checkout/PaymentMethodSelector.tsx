"use client";

import React from "react";
import { CreditCard, Bitcoin, Check, Smartphone, Globe, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   INLINE SVG BRAND LOGOS "” zero CDN dependency
   All rendered with inline SVG or styled spans.
   Pill height: 24px, consistent across all logos.
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const pill: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  height: 24, minWidth: 38, padding: "0 7px", borderRadius: 7, overflow: "hidden",
  flexShrink: 0,
};

function Visa() {
  return (
    <span style={{ ...pill, background: "#1A1F71" }}>
      <svg width="32" height="10" viewBox="0 0 200 70" fill="none">
        <path d="M76 65H50L65 5h26L76 65zM44 5L20 44 17 29 8 9A5 5 0 002 5v1h40zM0 5l14 60h26L62 5H0zM140 5c-6 0-12 4-12 4L97 65h26l5-13h32l3 13h23L140 5zm-4 30 13-24 6 24h-19z" fill="white" />
      </svg>
    </span>
  );
}

function Mastercard() {
  return (
    <span style={{ ...pill, background: "#111", padding: "0 5px" }}>
      <svg width="34" height="21" viewBox="0 0 52 33">
        <circle cx="18" cy="16.5" r="15" fill="#EB001B" />
        <circle cx="34" cy="16.5" r="15" fill="#F79E1B" />
        <path d="M26 5a15 15 0 010 23A15 15 0 0126 5z" fill="#FF5F00" />
      </svg>
    </span>
  );
}

function ApplePay() {
  return (
    <span style={{ ...pill, background: "#000", minWidth: 52 }}>
      <svg width="46" height="15" viewBox="0 0 115 38">
        <text x="2" y="27" fontFamily="-apple-system,Helvetica,sans-serif" fontSize="23" fontWeight="500" fill="white"> Pay</text>
      </svg>
    </span>
  );
}

function GooglePay() {
  return (
    <span style={{ ...pill, background: "#fff", border: "1px solid #e5e7eb", minWidth: 56 }}>
      <svg width="50" height="15" viewBox="0 0 124 38">
        <text x="2" y="27" fontFamily="Arial,sans-serif" fontSize="23" fontWeight="700" fill="#4285F4">G</text>
        <text x="20" y="27" fontFamily="Arial,sans-serif" fontSize="23" fontWeight="500" fill="#555">Pay</text>
      </svg>
    </span>
  );
}

function MTN() {
  return (
    <span style={{ ...pill, background: "#FFCC00" }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#000", letterSpacing: "0.05em" }}>MTN</span>
    </span>
  );
}

function Airtel() {
  return (
    <span style={{ ...pill, background: "#E60000" }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", fontStyle: "italic" }}>airtel</span>
    </span>
  );
}

function MoMo() {
  return (
    <span style={{ ...pill, background: "#000" }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: "#FFCC00" }}>MoMo</span>
    </span>
  );
}

function BTC() {
  return (
    <span style={{ ...pill, background: "#F7931A", padding: "0 5px" }}>
      <svg width="16" height="16" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="16" fill="#F7931A" />
        <path d="M21.2 13.7c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6-1.3-.3.7-2.6-1.7-.4-.7 2.6-3.2-.8-.4 1.8 1.1.3c.7.2.8.6.8 1l-1.8 7c-.1.4-.5.9-1.2.7l-1.1-.3-.8 1.9 3 .8-.7 2.7 1.7.4.7-2.7 1.3.3-.7 2.7 1.7.4.7-2.7c2.3.5 4.1-.2 4.6-2.3.4-1.6-.1-2.6-1.2-3.2.9-.2 1.5-.9 1.6-2zm-3 4.2c-.3 1.3-2.5.6-3.2.5l.6-2.5c.7.2 3 .5 2.6 2zm.4-4.3c-.3 1.2-2.1.6-2.7.5l.5-2.2c.7.2 2.5.4 2.2 1.7z" fill="white" />
      </svg>
    </span>
  );
}

function ETH() {
  return (
    <span style={{ ...pill, background: "#627EEA", padding: "0 6px" }}>
      <svg width="11" height="17" viewBox="0 0 256 417">
        <polygon points="128,0 128,154 0,209" fill="rgba(255,255,255,0.55)" />
        <polygon points="128,0 256,209 128,154" fill="white" />
        <polygon points="128,154 0,209 128,269" fill="rgba(255,255,255,0.55)" />
        <polygon points="128,154 256,209 128,269" fill="white" />
        <polygon points="128,294 0,232 128,417" fill="rgba(255,255,255,0.55)" />
        <polygon points="128,417 256,232 128,294" fill="white" />
      </svg>
    </span>
  );
}

function USDT() {
  return (
    <span style={{ ...pill, background: "#26A17B" }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>USDT</span>
    </span>
  );
}

function BNB() {
  return (
    <span style={{ ...pill, background: "#F3BA2F" }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: "#000" }}>BNB</span>
    </span>
  );
}

function PayPalBrand() {
  return (
    <span style={{ ...pill, background: "#fff", border: "1px solid #e5e7eb", minWidth: 58 }}>
      <svg width="52" height="14" viewBox="0 0 124 34">
        <text x="0" y="25" fontFamily="Arial,sans-serif" fontSize="24" fontWeight="800" fill="#003087">Pay</text>
        <text x="44" y="25" fontFamily="Arial,sans-serif" fontSize="24" fontWeight="800" fill="#009CDE">Pal</text>
      </svg>
    </span>
  );
}

/* Payment card styling replaced with Tailwind */

interface MethodDef {
  id: "pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay";
  title: string;
  icon: React.ReactNode;
  logos: React.ReactNode[];
}

const METHODS: MethodDef[] = [
  {
    id: "pesapal",
    title: "Credit / Debit Card",
    icon: <CreditCard className="h-[17px] w-[17px]" />,
    logos: [<Visa key="v" />, <Mastercard key="mc" />],
  },
  {
    id: "flutterwave",
    title: "Card & Digital Wallets",
    icon: <Globe className="h-[17px] w-[17px]" />,
    logos: [<Visa key="v" />, <Mastercard key="mc" />, <ApplePay key="ap" />, <GooglePay key="gp" />],
  },
  {
    id: "pawapay",
    title: "Mobile Money",
    icon: <Smartphone className="h-[17px] w-[17px]" />,
    logos: [<MTN key="mtn" />, <Airtel key="air" />, <MoMo key="mm" />],
  },
  {
    id: "nowpayments",
    title: "Cryptocurrency",
    icon: <Bitcoin className="h-[17px] w-[17px]" />,
    logos: [<BTC key="btc" />, <ETH key="eth" />, <USDT key="usdt" />, <BNB key="bnb" />],
  },
  {
    id: "paypal",
    title: "PayPal",
    icon: <Wallet className="h-[17px] w-[17px]" />,
    logos: [<PayPalBrand key="pp" />],
  },
];

export function PaymentMethodSelector({
  selected,
  onSelect,
  payCurrency: _pc,
  onCurrencyChange: _occ,
  orderCurrency: _oc,
  orderTotal: _ot,
  flutterwaveMethod: _fw,
  onFlutterwaveMethodChange: _ofwc,
}: {
  selected: "pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay" | null;
  onSelect: (m: "pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay") => void;
  payCurrency: string;
  onCurrencyChange: (c: string) => void;
  orderCurrency: string;
  orderTotal: number;
  flutterwaveMethod: "card" | "momo";
  onFlutterwaveMethodChange: (m: "card" | "momo") => void;
}) {
  return (
    <div className="space-y-2">
      {METHODS.map(m => {
        const active = selected === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={cn(
               "relative w-full text-left transition-all duration-200 active:scale-[0.985] rounded-none overflow-hidden ",
               active 
                  ? "bg-orange-50/80 dark:bg-orange-500/10 border border-orange-500/40 shadow-none shadow-orange-500/10"
                  : "bg-surface dark:bg-surface border border-border shadow-none hover:border-orange-500/20"
            )}
          >
            {/* Active top shimmer line */}
            {active && (
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"
              />
            )}

            <div className="flex items-center gap-3 px-4 py-3">
              {/* Icon circle */}
              <div
                className={cn(
                   "flex-shrink-0 flex items-center justify-center rounded-none w-9 h-9 border flex-shrink-0",
                   active 
                      ? "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-500" 
                      : "bg-surface dark:bg-surface-secondary border-border text-stone-400 dark:text-text-muted"
                )}
              >
                {m.icon}
              </div>

              {/* Title + logos */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                   "text-[12.5px] font-semibold leading-none mb-2",
                   active ? "text-orange-700 dark:text-orange-500" : "text-stone-600 dark:text-stone-300"
                )}>
                  {m.title}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  {m.logos}
                </div>
              </div>

              {/* Radio button */}
              <div
                className={cn(
                   "flex-shrink-0 flex items-center justify-center rounded-none transition-all duration-200 w-[21px] h-[21px] border-2",
                   active 
                      ? "bg-orange-500 border-orange-500 shadow-none shadow-orange-500/40" 
                      : "bg-transparent border-orange-500/20 dark:border-border-strong"
                )}
              >
                {active && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

