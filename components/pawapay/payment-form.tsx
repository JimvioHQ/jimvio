"use client";

import React, { useState } from "react";
import { Loader2, Smartphone, ShieldCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PawaPayPaymentFormProps {
  amount?: number;
  currency?: string;
  orderId?: string;
  onSuccess?: (details: any) => void;
  className?: string;
}

export function PawaPayPaymentForm({ amount = 1000, currency = "RWF", orderId, className }: PawaPayPaymentFormProps) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/pawapay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: (currency || "RWF").toUpperCase(),
          orderId,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not initiate payment");

      if (data.redirectUrl) {
        toast.success("Redirecting to secure payment page...");
        window.location.href = data.redirectUrl;
      } else {
        throw new Error("No redirect URL received from pawaPay");
      }
    } catch (error: any) {
      console.error("pawaPay checkout error:", error);
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("w-full bg-white dark:bg-surface rounded-sm overflow-hidden border border-zinc-100 dark:border-border shadow-none", className)}>
      <div className="p-6 bg-zinc-50 dark:bg-surface-secondary/80 border-b border-zinc-100 dark:border-border">
        <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-orange-500 dark:text-orange-400" /> Mobile Money
        </h2>
        <p className="text-xs font-bold text-zinc-400 dark:text-text-muted mt-1 uppercase tracking-widest leading-none">Fast & Secure Checkout</p>
      </div>

      <div className="p-8 text-center space-y-6">
        <div className="flex justify-center flex-wrap gap-4 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
           <img src="/logos/mtn-logo.png" alt="MTN" className="h-8 object-contain" />
           <img src="/logos/airtel-logo.png" alt="Airtel" className="h-8 object-contain" />
           <img src="/logos/mobile-money.png" alt="MoMo" className="h-8 object-contain" />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold text-zinc-500 dark:text-text-muted max-w-[240px] mx-auto">
            Pay safely using MTN, Airtel or other local mobile money providers.
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 dark:text-text-muted font-bold uppercase tracking-widest">
            <ShieldCheck className="h-3 w-3" /> Encrypted Transaction
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full h-14 rounded-sm bg-orange-500/10 border border-orange-500/30 text-orange-600 font-black text-base transition-all active:scale-95 flex items-center justify-center gap-2 group uppercase tracking-widest shadow-none"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Proceed to Payment
                <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </>
            )}
          </Button>
          
          <p className="mt-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-[2px] w-full text-center">
            Powered by pawaPay
          </p>
        </div>
      </div>
    </div>
  );
}

