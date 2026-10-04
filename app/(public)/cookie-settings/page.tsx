import type { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "@/lib/seo";
import { LEGAL_CONTACT } from "@/lib/legal/catalog";

export const metadata: Metadata = {
  ...constructMetadata({
    title: "Cookie settings",
    description:
      "How to control Jimvio cookies through your browser and where to read the Cookie Policy.",
    path: "/cookie-settings",
  }),
  robots: { index: false, follow: true },
};

export default function CookieSettingsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-16 dark:bg-[var(--color-bg)]">
      <div className="mx-auto max-w-2xl rounded-[18px] border border-[var(--color-border)] bg-white p-6 sm:p-8 dark:bg-[var(--color-surface)]">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#FF5A1F]">
          Jimvio Legal Center
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
          Cookie settings
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Jimvio uses essential cookies for authentication, security, and core platform features.
          Some optional cookies or similar technologies may be used for preferences, analytics, or
          marketing where enabled by the platform. Jimvio does not currently provide a granular
          in-app cookie consent manager on this page.
        </p>

        <div className="mt-6 space-y-4 text-sm text-[var(--color-text-secondary)]">
          <div className="rounded-[14px] border border-[var(--color-border)] bg-[#F8FAFC] p-4 dark:bg-[var(--color-surface-secondary)]">
            <p className="font-bold text-[var(--color-text-primary)]">Essential cookies</p>
            <p className="mt-1.5 leading-relaxed">
              Required for sign-in, session security, fraud protection, and checkout. These cannot
              be disabled if you want to use Jimvio accounts and purchases.
            </p>
          </div>
          <div className="rounded-[14px] border border-[var(--color-border)] bg-[#F8FAFC] p-4 dark:bg-[var(--color-surface-secondary)]">
            <p className="font-bold text-[var(--color-text-primary)]">Optional cookies</p>
            <p className="mt-1.5 leading-relaxed">
              Preference, analytics, or marketing technologies described in the Cookie Policy can
              be limited through your browser settings (block or delete cookies / site data). Affiliate
              attribution cookies may also be set when you use referral links.
            </p>
          </div>
        </div>

        <ul className="mt-6 space-y-3 text-sm text-[var(--color-text-secondary)]">
          <li>
            Read the full{" "}
            <Link href="/cookies" className="font-semibold text-[#C2410C] underline-offset-2 hover:underline">
              Cookie Policy
            </Link>
            .
          </li>
          <li>
            Review how Jimvio handles personal data in the{" "}
            <Link href="/privacy" className="font-semibold text-[#C2410C] underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            .
          </li>
          <li>
            Account privacy and visibility controls (separate from browser cookies) are available
            when signed in at{" "}
            <Link
              href="/identity/privacy"
              className="font-semibold text-[#C2410C] underline-offset-2 hover:underline"
            >
              Identity privacy settings
            </Link>
            .
          </li>
          <li>
            Questions:{" "}
            <a
              href={`mailto:${LEGAL_CONTACT.infoEmail}`}
              className="font-semibold text-[#C2410C] underline-offset-2 hover:underline"
            >
              {LEGAL_CONTACT.infoEmail}
            </a>
          </li>
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/cookies"
            className="inline-flex h-11 items-center rounded-[12px] bg-[#FF5A1F] px-5 text-sm font-bold text-white hover:bg-[#e04e18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
          >
            View Cookie Policy
          </Link>
          <Link
            href="/privacy"
            className="inline-flex h-11 items-center rounded-[12px] border border-[var(--color-border)] px-5 text-sm font-bold text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
          >
            Privacy Policy
          </Link>
          <Link
            href="/legal"
            className="inline-flex h-11 items-center rounded-[12px] border border-[var(--color-border)] px-5 text-sm font-bold text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
          >
            Legal Center
          </Link>
        </div>
      </div>
    </div>
  );
}
