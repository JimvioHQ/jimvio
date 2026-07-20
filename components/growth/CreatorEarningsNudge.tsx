import Link from "next/link";

export function CreatorEarningsNudge() {
  return (
    <section className="mt-6 rounded-xl border border-[#fd5000]/30 bg-orange-50/50 p-4 dark:bg-orange-950/10">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Set up your next earning step</h2>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Complete payouts so you can withdraw earnings, then publish a digital product to start selling.
      </p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-[#fd5000]">
        <Link href="/creator/payouts">Set up payouts →</Link>
        <Link href="/creator/digital">Publish a digital product →</Link>
      </div>
    </section>
  );
}
