
"use client";

import React from "react";
import { CreditCard, Bitcoin, Smartphone, Globe, Gift, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const pillBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  height: 22, minWidth: 36, padding: "0 6px", borderRadius: 5,
  fontSize: 10, fontWeight: 700, flexShrink: 0, overflow: "hidden",
};

function Visa() {
  return (
    <span style={{ ...pillBase, background: "#1A1F71", color: "#fff" }}>VISA</span>
  );
}

function Mastercard() {
  return (
    <span style={{ ...pillBase, background: "#111", padding: "0 4px", minWidth: 36 }}>
      <svg width="30" height="18" viewBox="0 0 52 33">
        <circle cx="18" cy="16.5" r="15" fill="#EB001B" />
        <circle cx="34" cy="16.5" r="15" fill="#F79E1B" />
        <path d="M26 5a15 15 0 010 23A15 15 0 0126 5z" fill="#FF5F00" />
      </svg>
    </span>
  );
}

function ApplePay() {
  return (
    <span style={{ ...pillBase, background: "#000", color: "#fff", minWidth: 48 }}>
      &#63743;&nbsp;Pay
    </span>
  );
}

function GooglePay() {
  return (
    <span style={{ ...pillBase, minWidth: 52, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)" }}>
      <span style={{ color: "#4285F4", fontWeight: 800 }}>G</span>
      <span style={{ color: "var(--color-text-secondary)", fontWeight: 600, marginLeft: 1 }}>Pay</span>
    </span>
  );
}

function MTN() {
  return <span style={{ ...pillBase, background: "#FFCC00", color: "#000" }}>MTN</span>;
}

function Airtel() {
  return <span style={{ ...pillBase, background: "#E60000", color: "#fff", fontStyle: "italic" }}>airtel</span>;
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
    <span style={{ ...pillBase, minWidth: 56, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", gap: 1 }}>
      <span style={{ color: "#003087", fontWeight: 800 }}>Pay</span>
      <span style={{ color: "#009CDE", fontWeight: 800 }}>Pal</span>
    </span>
  );
}

/* ── Method definitions ────────────────────────────────────────────────────── */

type MethodId = "pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay";

interface MethodDef {
  id: MethodId;
  title: string;
  description: string;
  icon: React.ReactNode;
  logos: React.ReactNode[];
}

const METHODS: MethodDef[] = [
  {
    id: "flutterwave",
    title: "Card & digital wallets",
    description: "Visa, Mastercard, Apple Pay, Google Pay",
    icon: <Globe className="h-4 w-4" />,
    logos: [<Visa key="v" />, <Mastercard key="mc" />, <ApplePay key="ap" />, <GooglePay key="gp" />],
  },
  {
    id: "pesapal",
    title: "Credit / debit card",
    description: "Visa and Mastercard accepted",
    icon: <CreditCard className="h-4 w-4" />,
    logos: [<Visa key="v" />, <Mastercard key="mc" />],
  },
  {
    id: "pawapay",
    title: "Mobile money",
    description: "MTN, Airtel, M-Pesa and more",
    icon: <Smartphone className="h-4 w-4" />,
    logos: [<MTN key="mtn" />, <Airtel key="air" />, <MoMo key="mm" />],
  },
  {
    id: "nowpayments",
    title: "Cryptocurrency",
    description: "BTC, ETH, USDT, BNB and more",
    icon: <Bitcoin className="h-4 w-4" />,
    logos: [<BTC key="btc" />, <ETH key="eth" />, <USDT key="usdt" />, <BNB key="bnb" />],
  },
  {
    id: "paypal",
    title: "PayPal",
    description: "Pay with your PayPal balance or card",
    icon: <Wallet className="h-4 w-4" />,
    logos: [<PayPalBrand key="pp" />],
  },
];

/* ── Component ─────────────────────────────────────────────────────────────── */

interface PaymentMethodSelectorProps {
  selected: MethodId | null;
  onSelect: (m: MethodId) => void;
  payCurrency: string;
  onCurrencyChange: (c: string) => void;
  orderCurrency: string;
  orderTotal: number;
  flutterwaveMethod: "card" | "momo";
  onFlutterwaveMethodChange: (m: "card" | "momo") => void;
}

export function PaymentMethodSelector({
  selected,
  onSelect,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-2">
      {METHODS.map((m) => {
        const active = selected === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={cn(
              "relative w-full text-left transition-all duration-200 active:scale-[0.99]",
              "rounded-sm overflow-hidden border",
              active
                ? "bg-orange-500/[0.04] border-orange-500/40 dark:bg-orange-500/[0.08]"
                : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
            )}
          >
            {/* Active accent line */}
            {active && (
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
            )}

            <div className="flex items-center gap-3 px-4 py-3">

              {/* Method icon */}
              <div className={cn(
                "flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border transition-colors",
                active
                  ? "bg-orange-500/10 border-orange-500/25 text-orange-500"
                  : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]"
              )}>
                {m.icon}
              </div>

              {/* Title + logos */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[13px] font-semibold leading-none mb-2",
                  active ? "text-orange-600 dark:text-orange-500" : "text-[var(--color-text-primary)]"
                )}>
                  {m.title}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {m.logos}
                </div>
              </div>

              {/* Checkmark */}
              <div className={cn(
                "flex-shrink-0 w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all duration-200",
                active
                  ? "bg-orange-500 border-orange-500"
                  : "bg-transparent border-[var(--color-border-strong)]"
              )}>
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

