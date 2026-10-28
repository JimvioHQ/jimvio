import Link from "next/link";
import { CheckCircle2, Circle, ReceiptText } from "lucide-react";
import { buildTrustReceiptLines, type StoreTrustFacts } from "@/lib/trust/store-receipt";

/** N-3: store Trust Receipt — facts from Jimvio records only. */
export function TrustReceipt({ facts }: { facts: StoreTrustFacts }) {
  const lines = buildTrustReceiptLines(facts);
  return (
    <section aria-labelledby="trust-receipt-title" className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ReceiptText className="h-4 w-4 text-[var(--color-accent)]" aria-hidden />
        <h4 id="trust-receipt-title" className="text-[13px] font-bold text-[var(--color-text-primary)]">
          Trust Receipt
        </h4>
      </div>
      <dl className="space-y-2">
        {lines.map((line) => (
          <div key={line.id} className="flex items-start justify-between gap-3 text-[12.5px]">
            <dt className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
              {line.tone === "good" ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
              )}
              {line.label}
            </dt>
            <dd className="text-right font-semibold tabular-nums text-[var(--color-text-primary)]">{line.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] leading-snug text-[var(--color-text-muted)]">
        From Jimvio records, not written by the seller.{" "}
        <Link href="/verified" className="font-medium underline-offset-2 hover:underline">
          What verification means
        </Link>
      </p>
    </section>
  );
}
