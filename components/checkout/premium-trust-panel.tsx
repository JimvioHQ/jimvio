"use client";

import { ShieldCheck, Truck, Lock, RotateCcw } from "lucide-react";

export function PremiumTrustPanel({
  deliveryHint,
}: {
  deliveryHint?: string | null;
}) {
  const items = [
    {
      icon: Lock,
      title: "Secure checkout",
      body: "Encrypted payments with buyer protection.",
    },
    {
      icon: Truck,
      title: "Delivery clarity",
      body: deliveryHint || "Estimated delivery shown before you pay.",
    },
    {
      icon: RotateCcw,
      title: "Easy support",
      body: "Order help and tracking in your Jimvio account.",
    },
    {
      icon: ShieldCheck,
      title: "Verified sellers",
      body: "Shop with confidence from Jimvio vendors.",
    },
  ];

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#fd5000]">
        Why checkout with Jimvio
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.title} className="flex gap-2.5">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#fd5000]/10 text-[#fd5000]">
              <item.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[12px] font-bold text-[var(--color-text-primary)]">{item.title}</p>
              <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
