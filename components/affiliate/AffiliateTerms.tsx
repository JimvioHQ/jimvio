import Link from "next/link";
import { Clock3, Percent, Wallet } from "lucide-react";

/**
 * The affiliate terms in plain words, read from the same values the code uses:
 * the attribution window constant and the platform payout minimum.
 */
export function AffiliateTerms({ windowDays, minPayoutRwf }: { windowDays: number; minPayoutRwf: number }) {
  const items = [
    {
      icon: Clock3,
      title: `${windowDays}-day attribution`,
      body: `When someone clicks your link, a sale they make within ${windowDays} days is credited to you (last click wins).`,
    },
    {
      icon: Percent,
      title: "Commission set by each seller",
      body: "Every product shows its commission before you promote it. You earn that share of the sale price.",
    },
    {
      icon: Wallet,
      title: "Paid to your Jimvio wallet",
      body: `Earnings land in your wallet once the order is confirmed. You can withdraw from RWF ${minPayoutRwf.toLocaleString("en-US")}.`,
    },
  ];
  return (
    <section aria-labelledby="affiliate-terms" className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6">
      <h2 id="affiliate-terms" className="text-xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
        How affiliate earnings work
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {items.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <Icon className="h-5 w-5 text-[#fd5000]" aria-hidden />
            <p className="mt-3 text-[15px] font-bold text-[var(--color-text-primary)]">{title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{body}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12px] text-[var(--color-text-muted)]">
        Earnings are not guaranteed. Full terms:{" "}
        <Link href="/legal" className="underline hover:text-[var(--color-text-primary)]">Legal Center</Link>.
      </p>
    </section>
  );
}
