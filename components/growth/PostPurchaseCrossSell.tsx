import Link from "next/link";
import { Sparkles } from "lucide-react";

export function PostPurchaseCrossSell() {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
      <Sparkles className="mx-auto h-4 w-4 text-[var(--color-accent)]" />
      <h2 className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">Keep exploring</h2>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">Discover popular picks from independent sellers.</p>
      <Link href="/marketplace" className="mt-3 inline-flex text-xs font-semibold text-[#fd5000]">Browse recommendations →</Link>
    </section>
  );
}
