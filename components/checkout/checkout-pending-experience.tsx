"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Loader2, Smartphone, Timer, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPawaPayFailureHint } from "@/lib/pawapay-failure-copy";

type View = "waiting" | "failed";

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const POLL_INTERVAL_MS = 5000;
const FETCH_ATTEMPTS = 4;

/** Same-origin POST with retries — dev / flaky networks often throw ECONNRESET on localhost. */
async function postSyncStatus(orderId: string): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 55_000);
      const res = await fetch("/api/payments/pawapay/sync-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < FETCH_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("sync-status request failed");
}

/**
 * Polls PawaPay deposit status and redirects to success when paid.
 * Renders a single clear screen: either "approve on your phone" or "payment failed".
 */
export function CheckoutPendingExperience({
  orderId,
  orderLabel,
  orderRouteId,
  pawapaySandbox,
  appBase,
  countdownSeconds,
}: {
  orderId: string;
  /** Display ref e.g. JV-556F2652 */
  orderLabel: string;
  /** UUID for /orders/:id */
  orderRouteId: string;
  pawapaySandbox: boolean;
  /** Site base URL for sandbox dev hints only */
  appBase: string;
  /** Approximate prompt window (seconds) for the countdown — not from PawaPay. Default 600 on the server. */
  countdownSeconds: number;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("waiting");
  const [depositStatus, setDepositStatus] = useState<string | null>(null);
  const [failureCode, setFailureCode] = useState<string | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [linkingDeposit, setLinkingDeposit] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [remainingSec, setRemainingSec] = useState(() => Math.max(0, countdownSeconds));
  /** Transient network / PawaPay errors — keep timers running and keep polling */
  const [pollWarning, setPollWarning] = useState(false);
  const stoppedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (view !== "waiting") return;
    const id = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
      setRemainingSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [view]);

  useEffect(() => {
    stoppedRef.current = false;

    async function tick() {
      if (stoppedRef.current) return;
      try {
        const res = await postSyncStatus(orderId);

        if (stoppedRef.current) return;

        if (res.status === 401) {
          stoppedRef.current = true;
          router.replace(`/login?redirect=${encodeURIComponent(`/checkout/pending?orderId=${orderId}`)}`);
          return;
        }

        const data = (await res.json()) as {
          payment_status?: string;
          done?: boolean;
          pawapay?: boolean;
          missingDepositId?: boolean;
          terminalFailure?: boolean;
          depositStatus?: string;
          failureCode?: string | null;
          failureMessage?: string | null;
          error?: string;
          transient?: boolean;
        };

        if (!res.ok) {
          // 502 from PawaPay / network — stay on page and retry; user can still confirm on phone
          setPollWarning(true);
          if (res.status === 404) {
            stoppedRef.current = true;
            router.replace("/checkout");
          }
          return;
        }

        setPollWarning(false);

        if (stoppedRef.current) return;

        if (data.payment_status === "completed" || data.done) {
          stoppedRef.current = true;
          router.replace(`/checkout/success?orderId=${encodeURIComponent(orderId)}`);
          return;
        }

        if (data.missingDepositId) {
          setLinkingDeposit(true);
        }

        if (data.terminalFailure) {
          stoppedRef.current = true;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setDepositStatus(data.depositStatus?.trim() || null);
          setFailureCode(typeof data.failureCode === "string" ? data.failureCode : null);
          setFailureMessage(typeof data.failureMessage === "string" ? data.failureMessage : null);
          setView("failed");
          return;
        }

        if (data.pawapay === false) {
          router.refresh();
        }
      } catch {
        if (!stoppedRef.current) setPollWarning(true);
      }
    }

    tick();
    intervalRef.current = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      stoppedRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [router, orderId]);

  if (view === "failed") {
    const hint = getPawaPayFailureHint(failureCode, failureMessage);
    const FailIcon = hint.isInsufficientFunds ? Wallet : AlertCircle;
    return (
      <div className="max-w-lg mx-auto text-center">
        <div
          className={cn(
            "mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full",
            hint.isInsufficientFunds ? "bg-amber-500/15" : "bg-[var(--color-danger)]/15"
          )}
          aria-hidden
        >
          <FailIcon
            className={cn(
              "h-10 w-10",
              hint.isInsufficientFunds ? "text-amber-600 dark:text-amber-400" : "text-[var(--color-danger)]"
            )}
          />
        </div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]">{hint.headline}</h1>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">{hint.detail}</p>
        {failureCode ? (
          <p className="mt-3 text-[11px] font-mono text-[var(--color-text-muted)]">{failureCode}</p>
        ) : null}
        {failureMessage && failureMessage.trim() !== hint.detail.trim() ? (
          <p className="mt-2 text-xs text-[var(--color-text-muted)] leading-relaxed">{failureMessage}</p>
        ) : null}
        {depositStatus ? (
          <p className="mt-2 text-xs font-mono text-[var(--color-text-muted)]">Deposit status: {depositStatus}</p>
        ) : null}

        {pawapaySandbox ? (
          <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3 text-left text-xs text-[var(--color-text-secondary)] leading-relaxed">
            <p className="font-semibold text-[var(--color-text-primary)]">Sandbox testing</p>
            <p className="mt-1">
              Each test number maps to a fixed outcome. Use an MSISDN from the{" "}
              <a
                href="https://docs.pawapay.io/v2/docs/test_numbers"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] underline underline-offset-2"
              >
                PawaPay test numbers
              </a>{" "}
              list on the <strong className="font-semibold">COMPLETED</strong> row for your network (e.g. Rwanda MTN{" "}
              <span className="font-mono text-[10px]">250783456789</span> with{" "}
              <span className="font-mono text-[10px]">MTN_MOMO_RWA</span>) to reach success.
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/checkout">Back to checkout</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/orders/${orderRouteId}`}>View order</Link>
          </Button>
        </div>
        <p className="mt-6 text-xs text-[var(--color-text-muted)]">
          You can try mobile money again from checkout, or pay with card or crypto if those are available for your order.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent-light)]">
          <Smartphone className="h-10 w-10 text-[var(--color-accent)]" aria-hidden />
        </div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]">Approve payment on your phone</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
          We&apos;ve sent a mobile money request for{" "}
          <span className="font-semibold text-[var(--color-text-primary)]">order #{orderLabel}</span>. Open your wallet
          app and confirm the amount when prompted.
        </p>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Keep this page open — the timers below keep running while we check for your confirmation.
        </p>
        {linkingDeposit ? (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">Connecting your payment — this usually takes a few seconds.</p>
        ) : null}
      </div>

      <ol className="mt-8 space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left text-sm text-[var(--color-text-primary)]">
        <li className="flex gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-xs font-bold text-[var(--color-accent)]"
            aria-hidden
          >
            1
          </span>
          <span>
            <span className="font-semibold">Open your mobile money app</span>
            <span className="block text-[var(--color-text-secondary)] mt-0.5">MTN MoMo, Airtel Money, or the prompt you use for this number.</span>
          </span>
        </li>
        <li className="flex gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-xs font-bold text-[var(--color-accent)]"
            aria-hidden
          >
            2
          </span>
          <span>
            <span className="font-semibold">Approve the payment</span>
            <span className="block text-[var(--color-text-secondary)] mt-0.5">Confirm the amount and complete the charge before it times out.</span>
          </span>
        </li>
        <li className="flex gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-xs font-bold text-[var(--color-accent)]"
            aria-hidden
          >
            3
          </span>
          <span>
            <span className="font-semibold">Wait on this page</span>
            <span className="block text-[var(--color-text-secondary)] mt-0.5">
              When your wallet confirms, we&apos;ll move you to the order confirmation automatically.
            </span>
          </span>
        </li>
      </ol>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-left">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-light)]">
            <Clock className="h-5 w-5 text-[var(--color-accent)]" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Time waiting
            </p>
            <p className="text-2xl font-black tabular-nums tracking-tight text-[var(--color-text-primary)]">
              {formatMmSs(elapsedSec)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-left">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)]">
            <Timer className="h-5 w-5 text-[var(--color-accent)]" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Prompt window (guide)
            </p>
            <p className="text-2xl font-black tabular-nums tracking-tight text-[var(--color-text-primary)]">
              {formatMmSs(remainingSec)}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-[var(--color-text-muted)]">
              Approximate — your network may allow more or less time.
            </p>
          </div>
        </div>
      </div>

      {remainingSec === 0 ? (
        <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-xs text-amber-950 dark:text-amber-100">
          The guided window has reached zero, but your payment can still complete. If nothing happens, open your wallet
          again or return to checkout to send a new request.
        </p>
      ) : null}

      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/80 px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--color-accent)]" aria-hidden />
          <span>Waiting for you to confirm on your phone — checking payment status…</span>
        </div>
        {pollWarning ? (
          <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-center text-xs text-amber-950 dark:text-amber-100">
            Brief connection issue — we&apos;ll keep trying automatically. You can still approve the payment in your
            wallet; this page will update when the provider responds.
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 px-4 py-3 text-left text-xs text-[var(--color-text-secondary)] leading-relaxed">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
        <p>
          <span className="font-semibold text-[var(--color-text-primary)]">Already paid?</span> If you approved the
          prompt, it can take a short moment to show here. You can also open{" "}
          <Link href={`/orders/${orderRouteId}`} className="font-medium text-[var(--color-accent)] underline underline-offset-2">
            order details
          </Link>{" "}
          to see the latest status.
        </p>
      </div>

      {pawapaySandbox ? (
        <details className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 px-4 py-3 text-left text-xs text-[var(--color-text-muted)] leading-relaxed">
          <summary className="cursor-pointer font-semibold text-[var(--color-text-secondary)]">Developer / local testing</summary>
          <p className="mt-2">
            Webhooks often don&apos;t reach <code className="text-[10px]">localhost</code>, so this page polls the API
            until the deposit completes. For callbacks from a public URL, register{" "}
            <code className="break-all text-[10px]">{`${appBase}/api/payments/pawapay/callback`}</code> in the PawaPay
            sandbox dashboard with <code className="text-[10px]">PAWAPAY_ENV=sandbox</code>.
          </p>
        </details>
      ) : null}

      <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild variant="outline">
          <Link href={`/orders/${orderRouteId}`}>View order status</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
