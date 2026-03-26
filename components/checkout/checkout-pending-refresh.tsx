"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Polls PawaPay deposit status and finalizes the order when COMPLETED (covers localhost where webhooks never arrive).
 * Also refreshes the route for other pending payment types.
 */
export function CheckoutPendingRefresh({
  orderId,
  intervalMs = 4000,
}: {
  orderId: string;
  intervalMs?: number;
}) {
  const router = useRouter();
  const [terminalFailure, setTerminalFailure] = useState(false);
  const [depositStatus, setDepositStatus] = useState<string | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;

    async function tick() {
      if (stoppedRef.current) return;
      try {
        const res = await fetch("/api/payments/pawapay/sync-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = (await res.json()) as {
          payment_status?: string;
          done?: boolean;
          pawapay?: boolean;
          missingDepositId?: boolean;
          terminalFailure?: boolean;
          depositStatus?: string;
        };

        if (stoppedRef.current) return;

        if (data.payment_status === "completed" || data.done) {
          stoppedRef.current = true;
          router.replace(`/checkout/success?orderId=${encodeURIComponent(orderId)}`);
          return;
        }

        if (data.terminalFailure) {
          stoppedRef.current = true;
          setTerminalFailure(true);
          setDepositStatus(data.depositStatus?.trim() || null);
          return;
        }

        if (data.pawapay === false) {
          router.refresh();
        }
      } catch {
        if (!stoppedRef.current) router.refresh();
      }
    }

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      stoppedRef.current = true;
      clearInterval(id);
    };
  }, [router, orderId, intervalMs]);

  useEffect(() => {
    const t0 = setTimeout(() => router.refresh(), 2000);
    return () => clearTimeout(t0);
  }, [router]);

  if (terminalFailure) {
    return (
      <p className="mx-auto mt-4 max-w-md rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-text-primary)]">
        This mobile-money payment was declined or failed
        {depositStatus ? (
          <>
            {" "}
            (PawaPay deposit status: <span className="font-mono text-xs">{depositStatus}</span>)
          </>
        ) : null}
        . In sandbox, each test phone number maps to a fixed outcome — see{" "}
        <a
          href="https://docs.pawapay.io/v2/docs/test_numbers"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 text-[var(--color-accent)]"
        >
          PawaPay sandbox test numbers
        </a>
        . Use the MSISDN on the <strong className="font-semibold">COMPLETED</strong> row for your network (e.g. Rwanda
        MTN <span className="font-mono text-xs">250783456789</span> with{" "}
        <span className="font-mono text-xs">MTN_MOMO_RWA</span>) to reach success. You can return to checkout and try
        again, or choose PesaPal or crypto.
      </p>
    );
  }

  return null;
}
