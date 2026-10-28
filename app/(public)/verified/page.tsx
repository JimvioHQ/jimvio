import React from "react";
import Link from "next/link";
import { BadgeCheck, CircleAlert, ShieldCheck } from "lucide-react";
import { getTopVendors } from "@/services/db";

/**
 * What "Verified" means on Jimvio (T-2).
 *
 * The previous page promised factory audits, ISO/CE certification and an
 * "elite 5%" network. Jimvio does none of that. This page states what the
 * badge actually means and lists the stores that carry it.
 */
export const revalidate = 300;

type VendorRow = {
  id: string;
  business_name: string | null;
  business_slug: string | null;
  business_country: string | null;
  verification_status: string | null;
};

const CHECKED = [
  "The seller submitted business details to Jimvio: name, contact details and, where available, address and tax ID.",
  "A Jimvio team member reviewed those details and approved the store.",
  "Verified stores can sell physical products; other stores are limited until they are reviewed.",
];

const NOT_CHECKED = [
  "It is not a factory or warehouse inspection.",
  "It is not a product quality, safety or regulatory certification.",
  "It does not guarantee delivery times or a refund on its own. Buyer Protection covers eligible orders.",
];

export default async function VerifiedSellersPage() {
  const vendors = ((await getTopVendors(48).catch(() => [])) ?? []) as VendorRow[];
  const verified = vendors.filter((v) => v.verification_status === "verified");

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <section className="mx-auto max-w-3xl px-4 pb-10 pt-14 sm:px-6">
        <p className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#FF5A1F]">
          <BadgeCheck className="h-4 w-4" aria-hidden /> Verified sellers
        </p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,2.75rem)] font-black leading-[1.08] tracking-tight">
          What the Verified badge means
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
          The badge tells you a person at Jimvio reviewed this store before approving it. Here is
          exactly what that covers, and what it does not.
        </p>
      </section>

      <section className="mx-auto grid max-w-3xl gap-5 px-4 pb-12 sm:px-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden /> What is checked
          </h2>
          <ul className="mt-4 space-y-3 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
            {CHECKED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <CircleAlert className="h-4 w-4 text-amber-600" aria-hidden /> What it is not
          </h2>
          <ul className="mt-4 space-y-3 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
            {NOT_CHECKED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h2 className="text-lg font-bold">Verified stores with active listings</h2>
        {verified.length === 0 ? (
          <p className="mt-3 text-[14px] text-[var(--color-text-secondary)]">
            No verified store has an active listing right now.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {verified.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-semibold">
                    {v.business_name ?? "Store"}
                    <BadgeCheck className="h-4 w-4 text-emerald-600" aria-label="Verified" />
                  </span>
                  {v.business_country ? (
                    <span className="text-[13px] text-[var(--color-text-muted)]">{v.business_country}</span>
                  ) : null}
                </span>
                {v.business_slug ? (
                  <Link href={`/vendors/${v.business_slug}`} className="shrink-0 text-[13px] font-semibold text-[#FF5A1F] hover:underline">
                    View store
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-[13px] text-[var(--color-text-muted)]">
          Selling on Jimvio? Submit your business details from your seller settings to request
          review. See also <Link href="/protection" className="underline">Buyer Protection</Link>.
        </p>
      </section>
    </main>
  );
}
