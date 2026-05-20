"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Copy, Check, ShoppingCart, ArrowRight, Clock, Mail,
  ShieldCheck, AlertTriangle, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReasonKey =
  | "server_error"
  | "verification_failed"
  | "user_cancelled"
  | "insufficient_funds"
  | "payment_failed"
  | "payment_cancelled"
  | "order_not_found"
  | "provider_failed"
  | "session_expired"
  | "default";

interface ReasonConfig {
  title: string;
  tagline: string;
  charged: boolean;
  troubleshoot?: string[];
  autoRetry?: boolean;
  pollStatus?: boolean;
  primaryCta: "retry" | "cart";
}

// ─── Reason map ───────────────────────────────────────────────────────────────

const REASONS: Record<ReasonKey, ReasonConfig> = {
  server_error: {
    title: "Something went wrong on our end",
    tagline: "We hit an unexpected error while processing your payment. Your account was not charged.",
    charged: false,
    autoRetry: true,
    primaryCta: "retry",
    troubleshoot: [
      "Try again in a few minutes",
      "Contact support if this keeps happening",
    ],
  },
  verification_failed: {
    title: "Couldn't verify your payment",
    tagline: "The payment provider didn't confirm your transaction in time. We're still checking in the background.",
    charged: true,
    pollStatus: true,
    primaryCta: "retry",
    troubleshoot: [
      "Any deducted amount will be returned within 5–7 business days",
      "Wait 10 minutes, then try again",
      "Contact support if you see a charge that isn't on your orders page",
    ],
  },
  user_cancelled: {
    title: "Payment cancelled",
    tagline: "Your cart is still saved.",
    charged: false,
    primaryCta: "retry",
  },
  payment_cancelled: {
    title: "Payment cancelled",
    tagline: "Your cart is still saved.",
    charged: false,
    primaryCta: "retry",
  },
  insufficient_funds: {
    title: "Payment declined",
    tagline: "Your payment was declined due to insufficient funds. Nothing was charged.",
    charged: false,
    primaryCta: "retry",
    troubleshoot: [
      "Top up your balance and try again",
      "Or pick a different payment method at checkout",
    ],
  },
  payment_failed: {
    title: "Payment declined",
    tagline: "Your provider declined the transaction. Nothing was charged.",
    charged: false,
    primaryCta: "retry",
    troubleshoot: [
      "Try a different payment method at checkout",
      "Make sure your account is enabled for online payments",
    ],
  },
  provider_failed: {
    title: "Payment failed",
    tagline: "The payment provider reported a failure. Nothing was charged.",
    charged: false,
    primaryCta: "retry",
    troubleshoot: [
      "Try a different payment method at checkout",
      "Contact support if money was deducted",
    ],
  },
  order_not_found: {
    title: "Order not found",
    tagline: "This order may have expired. Start a fresh checkout from your cart.",
    charged: false,
    primaryCta: "cart",
  },
  session_expired: {
    title: "Session expired",
    tagline: "Your payment session is no longer valid. Please start checkout again.",
    charged: false,
    primaryCta: "cart",
  },
  default: {
    title: "Payment didn't complete",
    tagline: "Your cart is still saved. Nothing was charged.",
    charged: false,
    primaryCta: "retry",
  },
};

// ─── Polling hook (fixed) ────────────────────────────────────────────────────

function useStatusPoller(orderId: string | null, enabled: boolean) {
  const router = useRouter();
  const [polling, setPolling] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!orderId || !enabled) return;

    setPolling(true);
    attemptsRef.current = 0;

    const check = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.paymentStatus === "paid" || data.paymentStatus === "completed") {
            router.replace(`/checkout/success?order=${orderId}`);
            return;
          }
        }
      } catch {
        // silent — retry
      }

      attemptsRef.current += 1;
      if (attemptsRef.current < 5) {
        timeoutRef.current = setTimeout(check, 8000);
      } else {
        setPolling(false);
      }
    };

    timeoutRef.current = setTimeout(check, 3000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setPolling(false);
    };
  }, [orderId, enabled, router]);

  return polling;
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors px-1.5 py-0.5"
      type="button"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-500">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </button>
  );
}

// ─── Auto-retry countdown ────────────────────────────────────────────────────

function RetryCountdown({ orderId, total = 10 }: { orderId: string; total?: number }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(total);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (stopped) return;
    if (seconds <= 0) {
      router.push(`/checkout?order=${orderId}&retry=true`);
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, stopped, orderId, router]);

  const progress = Math.round(((total - seconds) / total) * 100);

  return (
    <div className="mt-5 pt-5 border-t border-[var(--color-border)]">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <Clock className="h-3 w-3" />
          {stopped ? "Auto-retry stopped" : seconds > 0 ? `Retrying in ${seconds}s` : "Redirecting…"}
        </span>
        {!stopped && seconds > 0 && (
          <button
            onClick={() => setStopped(true)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:underline"
            type="button"
          >
            Stop
          </button>
        )}
      </div>
      <div className="h-0.5 w-full bg-[var(--color-surface-secondary)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-text-primary)] rounded-full transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Email opt-in ────────────────────────────────────────────────────────────

function EmailOptIn({ orderId }: { orderId: string }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/notify-on-payment`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      setDone(true);
      toast.success("We'll email you once your payment confirms.");
    } catch {
      toast.error("Couldn't set that up. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-500 mb-4">
        <Check className="h-3.5 w-3.5" />
        We'll email you when payment confirms.
      </div>
    );
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      type="button"
      className="w-full inline-flex items-center justify-center gap-2 mb-4 py-2.5 rounded border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
    >
      <Mail className="h-3.5 w-3.5" />
      {loading ? "Setting up…" : "Notify me by email when payment confirms"}
    </button>
  );
}

// ─── Main content ────────────────────────────────────────────────────────────

function CancelContent() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const rawReason = params.get("reason") ?? "default";
  const reason: ReasonKey = (rawReason in REASONS ? rawReason : "default") as ReasonKey;
  const info = REASONS[reason];

  const polling = useStatusPoller(orderId, !!info.pollStatus);

  const primaryHref =
    info.primaryCta === "retry" && orderId
      ? `/checkout?order=${orderId}&retry=true`
      : "/cart";

  const primaryLabel = info.primaryCta === "retry" && orderId ? "Try again" : "Back to cart";

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md overflow-hidden">
          {/* Accent bar */}
          <div className="h-0.5 w-full bg-rose-500" />

          <div className="p-6 sm:p-7">
            {/* Title */}
            <div className="flex items-start gap-3 mb-5">
              <div className="h-9 w-9 rounded-full bg-rose-50 dark:bg-rose-950/40 ring-1 ring-rose-200 dark:ring-rose-900 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle
                  className="h-4 w-4 text-rose-600 dark:text-rose-500"
                  strokeWidth={2}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)] tracking-tight leading-snug">
                  {info.title}
                </h1>
                <p className="mt-1.5 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {info.tagline}
                </p>
              </div>
            </div>

            {/* Charge status */}
            {info.charged ? (
              <div className="flex items-start gap-2.5 p-3 mb-5 rounded border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle
                  className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5"
                  strokeWidth={2}
                />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  If money was deducted, it will be returned within 5–7 business days automatically.
                </p>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-500 mb-5">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
                Your account was not charged.
              </div>
            )}

            {/* Polling indicator */}
            {polling && (
              <div className="flex items-center gap-2 mb-4 text-xs text-[var(--color-text-muted)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                Checking payment status in the background…
              </div>
            )}

            {/* Order reference */}
            {orderId && (
              <div className="mb-5 flex items-center justify-between gap-3 px-3 py-2 rounded bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                    Ref
                  </span>
                  <code className="text-xs font-mono text-[var(--color-text-primary)] truncate">
                    {orderId}
                  </code>
                </div>
                <CopyButton value={orderId} />
              </div>
            )}

            {/* Email opt-in (only when polling for payment) */}
            {orderId && info.pollStatus && <EmailOptIn orderId={orderId} />}

            {/* Troubleshoot tips */}
            {info.troubleshoot && info.troubleshoot.length > 0 && (
              <div className="mb-6 pt-5 border-t border-[var(--color-border)]">
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2.5">
                  What to try
                </p>
                <ul className="space-y-1.5 text-sm text-[var(--color-text-secondary)]">
                  {info.troubleshoot.map((tip, i) => (
                    <li key={i} className="flex gap-2 leading-relaxed">
                      <span className="text-[var(--color-text-muted)] shrink-0">
                        {i + 1}.
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Link
                href={primaryHref}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-md text-sm font-medium bg-[var(--color-text-primary)] text-[var(--color-bg)] hover:opacity-90 transition-opacity"
              >
                {primaryLabel}
                {info.primaryCta === "retry" ? (
                  <ArrowRight className="h-4 w-4" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
              </Link>

              {info.primaryCta === "retry" && (
                <Link
                  href="/cart"
                  className="flex-1 inline-flex items-center justify-center h-10 px-5 rounded-md text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                >
                  Back to cart
                </Link>
              )}
            </div>

            {/* Auto-retry */}
            {info.autoRetry && orderId && (
              <RetryCountdown orderId={orderId} total={10} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 px-1 text-xs text-[var(--color-text-muted)] space-y-2">
          <p className="flex items-center gap-1.5">
            <MessageCircle className="h-3 w-3" />
            <Link
              href={orderId ? `/support?ref=${orderId}` : "/support"}
              className="hover:underline hover:text-[var(--color-text-primary)] transition-colors"
            >
              Contact support
            </Link>
          </p>
          <p className="flex gap-3">
            <Link
              href="/dashboard/orders"
              className="hover:underline hover:text-[var(--color-text-primary)] transition-colors"
            >
              My orders
            </Link>
            <Link
              href="/help/payments"
              className="hover:underline hover:text-[var(--color-text-primary)] transition-colors"
            >
              Payment FAQ
            </Link>
            <Link
              href="/help/refunds"
              className="hover:underline hover:text-[var(--color-text-primary)] transition-colors"
            >
              Refund policy
            </Link>
            <Link
              href="/marketplace"
              className="hover:underline hover:text-[var(--color-text-primary)] transition-colors"
            >
              Continue shopping
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function CancelSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md overflow-hidden">
          <div className="h-0.5 bg-[var(--color-border)]" />
          <div className="p-6 sm:p-7 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 bg-[var(--color-surface-secondary)] rounded-full animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 bg-[var(--color-surface-secondary)] rounded animate-pulse" />
                <div className="h-4 w-full bg-[var(--color-surface-secondary)] rounded animate-pulse" />
              </div>
            </div>
            <div className="h-10 bg-[var(--color-surface-secondary)] rounded-md animate-pulse" />
            <div className="flex gap-2">
              <div className="flex-1 h-10 bg-[var(--color-surface-secondary)] rounded-md animate-pulse" />
              <div className="flex-1 h-10 bg-[var(--color-surface-secondary)] rounded-md animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={<CancelSkeleton />}>
      <CancelContent />
    </Suspense>
  );
}