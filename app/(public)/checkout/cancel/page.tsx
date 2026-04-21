"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { X, ArrowRight, ShieldAlert, ShoppingBag, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function CancelContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const reason = searchParams.get("reason");

  const message = 
    reason === "server_error" ? "A technical error occurred during processing." :
    reason === "verification_failed" ? "We couldn't verify the payment status." :
    "The payment process was cancelled or didn't go through.";

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-20 relative overflow-hidden">
      {/* Abstract background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 rounded-none blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-500/5 rounded-none blur-[120px] translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-[540px] w-full relative z-10">
        <div className="bg-white dark:bg-surface rounded-none border border-zinc-100 dark:border-border p-10 md:p-14 shadow-[0_32px_96px_-16px_rgba(0,0,0,0.06)] text-center">
          
          {/* Icon */}
          <div className="mx-auto mb-10 w-24 h-24 rounded-none bg-red-50 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-red-500/5 rounded-none animate-ping opacity-20" />
            <div className="w-16 h-16 rounded-none bg-red-500 flex items-center justify-center text-white shadow-none shadow-red-200">
              <ShieldAlert className="h-8 w-8" strokeWidth={2.5} />
            </div>
          </div>

          <h1 className="text-[28px] md:text-[32px] font-black text-[#1a1428] tracking-tight leading-tight">
            Checkout Cancelled
          </h1>
          
          <p className="mt-4 text-zinc-400 font-medium text-balance leading-relaxed">
            {message} No charges were captured from your account.
          </p>

          <div className="mt-12 space-y-3">
             {orderId ? (
                <Button asChild size="lg" className="h-16 w-full rounded-none bg-[#1a1428] hover:bg-black text-white font-black text-sm shadow-none shadow-zinc-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                  <Link href={`/orders/${orderId}`}>
                     Resume Payment
                     <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
             ) : (
                <Button asChild size="lg" className="h-16 w-full rounded-none bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow-none shadow-orange-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                  <Link href="/checkout">
                     Back to Checkout
                     <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
             )}

             <div className="grid grid-cols-2 gap-3 pt-2">
                <Button asChild variant="outline" className="h-14 rounded-none border-zinc-100 dark:border-border hover:bg-zinc-50 dark:bg-surface/50 text-zinc-600 font-bold text-[13px] gap-2">
                  <Link href="/marketplace">
                    <ShoppingBag className="h-4 w-4" />
                    Shop More
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-14 rounded-none border-zinc-100 dark:border-border hover:bg-zinc-50 dark:bg-surface/50 text-zinc-600 font-bold text-[13px] gap-2">
                  <Link href="/">
                    <Home className="h-4 w-4" />
                    Go Home
                  </Link>
                </Button>
             </div>
          </div>

          <p className="mt-10 text-[10px] font-black uppercase tracking-[2px] text-zinc-300">
             Jimvio Global Secure Network
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fafafa]" />}>
      <CancelContent />
    </Suspense>
  );
}


