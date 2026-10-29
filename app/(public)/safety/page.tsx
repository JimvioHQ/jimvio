import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, BadgeCheck, CreditCard, Flag, KeyRound, ShieldCheck } from "lucide-react";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Safety Center",
  description: "How Jimvio protects buyers, sellers and creators — and what you can do to stay safe.",
  path: "/safety",
});

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Buyer Protection",
    body: "Eligible orders paid through Jimvio checkout are reviewed by support if something goes wrong.",
    href: "/protection",
    cta: "How Buyer Protection works",
  },
  {
    icon: BadgeCheck,
    title: "What \"Verified\" means",
    body: "A verified store submitted business details that a Jimvio team member reviewed. We explain exactly what is and isn't checked.",
    href: "/verified",
    cta: "Read what we check",
  },
  {
    icon: CreditCard,
    title: "Pay only through Jimvio",
    body: "Pay at Jimvio checkout or from your Jimvio wallet. Payments made outside Jimvio are not covered and can't be recovered by us.",
    href: "/refunds-payouts",
    cta: "Refunds and payouts",
  },
  {
    icon: KeyRound,
    title: "Two-factor authentication",
    body: "Add a second step to every sign-in so a stolen password isn't enough to get into your account or wallet.",
    href: "/identity/security",
    cta: "Turn on 2FA",
  },
  {
    icon: Flag,
    title: "Report what looks wrong",
    body: "Use Report on any post that breaks the rules. Community owners and Jimvio moderators review reports.",
    href: "/community-guidelines",
    cta: "Community guidelines",
  },
  {
    icon: AlertTriangle,
    title: "Products that aren't allowed",
    body: "Some products can't be sold on Jimvio. Listings that break the rules are blocked automatically and taken down.",
    href: "/prohibited-products",
    cta: "See the list",
  },
];

const SCAMS = [
  "Jimvio staff will never ask for your password, your 2FA code or your wallet PIN.",
  "Don't move a deal to WhatsApp, a bank transfer or crypto to \"save fees\" — you lose Buyer Protection.",
  "Promises of guaranteed income are a red flag. Jimvio never guarantees earnings.",
  "Check the web address is jimvio.com before you sign in.",
];

export default function SafetyCenterPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg,#fff)]">
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[1100px] px-4 pb-12 pt-28 sm:px-6">
          <p className="text-[12px] font-bold uppercase tracking-wider text-[#fd5000]">Safety Center</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            Staying safe on Jimvio
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
            What Jimvio does to protect you, and the simple habits that keep your money and account safe.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6">
        <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body, href, cta }) => (
            <li key={title} className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fd5000]/10 text-[#fd5000]">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[16px] font-bold text-[var(--color-text-primary)]">{title}</h2>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{body}</p>
              <Link href={href} className="mt-4 text-[13px] font-semibold text-[#fd5000] hover:underline">
                {cta} →
              </Link>
            </li>
          ))}
        </ul>

        <section className="mt-10 rounded-3xl border border-amber-200 bg-amber-50/60 p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-amber-900">
            <AlertTriangle className="h-5 w-5" /> Spot a scam
          </h2>
          <ul className="mt-4 space-y-2">
            {SCAMS.map((s) => (
              <li key={s} className="flex gap-2 text-[14px] leading-relaxed text-amber-900/90">
                <span aria-hidden>•</span>
                {s}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 flex flex-col items-start gap-3 rounded-3xl bg-[#0f1115] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-[16px] font-bold">Something wrong with an order or account?</p>
            <p className="text-[13px] text-white/70">Open a ticket and our support team will look into it.</p>
          </div>
          <Link href="/help" className="rounded-full bg-[#fd5000] px-5 py-2.5 text-[14px] font-bold text-white hover:bg-[#e04800]">
            Get help
          </Link>
        </section>
      </div>
    </div>
  );
}
