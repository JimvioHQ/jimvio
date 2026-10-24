import Link from "next/link";
import {
  ArrowRight,
  Download,
  Mail,
  Megaphone,
  Scale,
  ShoppingBag,
  Users,
} from "lucide-react";
import { ABOUT_FEATURES } from "@/lib/about/content";
import { CONCISE_DEFINITION } from "@/lib/brand/positioning";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";
import { SITE } from "@/lib/seo";

const BOILERPLATE = CONCISE_DEFINITION;

const FACTS = [
  { label: "Company", value: "Jimvio Inc." },
  { label: "Product", value: SITE.tagline },
  { label: "Website", value: "www.jimvio.com" },
];

export default async function PressPage() {
  const { contact } = await getResolvedPlatformSettings();
  const mediaEmail = contact.info_email;
  const platformHighlights = ABOUT_FEATURES.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[var(--color-bg)]">
      <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(135deg,#FFF8F4_0%,#FFF1E8_42%,#FFFFFF_100%)] dark:bg-[linear-gradient(135deg,#1a0f0a_0%,#120c09_100%)]">
        <div className="mx-auto max-w-8xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#FF5A1F]">
            Press & Media
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)] sm:text-5xl md:text-6xl">
            Media resources for Jimvio
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
            Company overview, brand assets, and the right contact for journalists and partners.
            We do not invent press coverage, awards, or statistics for this page.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`mailto:${mediaEmail}?subject=${encodeURIComponent("Jimvio press inquiry")}`}
              className="inline-flex h-12 items-center gap-2 rounded-[12px] bg-[#FF5A1F] px-6 text-sm font-bold text-white transition hover:bg-[#e04e18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Media inquiry
            </a>
            <Link
              href="/about#assets"
              className="inline-flex h-12 items-center gap-2 rounded-[12px] border border-[var(--color-border)] bg-white px-6 text-sm font-bold text-[#111827] transition hover:border-[rgba(255,90,31,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] dark:bg-[var(--color-surface)] dark:text-[var(--color-text-primary)]"
            >
              Brand assets
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-8xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
              About Jimvio for media
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
              {BOILERPLATE}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
              Jimvio was founded to make earning online possible without gatekeepers or a
              requirement for millions of followers. Product, payment, and payout availability
              varies by country and account. Income is not guaranteed.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {platformHighlights.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-[16px] border border-[var(--color-border)] bg-white p-4 dark:bg-[var(--color-surface)]"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <p className="mt-3 text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                      {feature.title}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 dark:bg-[var(--color-surface)]">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                <Megaphone className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                Company facts
              </h3>
              <dl className="mt-4 space-y-3">
                {FACTS.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      {fact.label}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-[#111827] dark:text-[var(--color-text-primary)]">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 dark:bg-[var(--color-surface)]">
              <h3 className="text-base font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                Media contact
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                For interviews, brand usage questions, and media requests, email the Jimvio team.
              </p>
              <a
                href={`mailto:${mediaEmail}`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#C2410C] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {mediaEmail}
              </a>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-y border-[var(--color-border)] bg-white dark:bg-[var(--color-surface)]">
        <div className="mx-auto max-w-8xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
            Brand assets
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Use official Jimvio marks only. Full brand guidance — including color, typography, and
            misuse rules — lives on the About page.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="/jimvio-logo.svg"
              download
              className="flex items-start gap-3 rounded-[16px] border border-[var(--color-border)] bg-[#F8FAFC] p-5 transition hover:border-[rgba(255,90,31,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] dark:bg-[var(--color-bg)]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                <Download className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                  Logo (SVG)
                </span>
                <span className="mt-1 block text-sm text-[var(--color-text-muted)]">
                  Official Jimvio wordmark download
                </span>
              </span>
            </a>
            <Link
              href="/about#assets"
              className="flex items-start gap-3 rounded-[16px] border border-[var(--color-border)] bg-[#F8FAFC] p-5 transition hover:border-[rgba(255,90,31,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] dark:bg-[var(--color-bg)]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                  Brand kit
                </span>
                <span className="mt-1 block text-sm text-[var(--color-text-muted)]">
                  Colors, logo rules, and approved assets
                </span>
              </span>
            </Link>
            <Link
              href="/legal"
              className="flex items-start gap-3 rounded-[16px] border border-[var(--color-border)] bg-[#F8FAFC] p-5 transition hover:border-[rgba(255,90,31,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] dark:bg-[var(--color-bg)]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                <Scale className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                  Legal Center
                </span>
                <span className="mt-1 block text-sm text-[var(--color-text-muted)]">
                  Terms, privacy, and platform policies
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-8xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[20px] bg-[#111827] px-6 py-10 text-white sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                Need a quote or interview?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Reach the Jimvio team with your deadline, outlet, and topic. We will respond through
                the published contact channel.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={`mailto:${mediaEmail}?subject=${encodeURIComponent("Jimvio press inquiry")}`}
                className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#FF5A1F] px-5 text-sm font-bold text-white hover:bg-[#e04e18]"
              >
                Email media
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                href="/contact?topic=press"
                className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-white/20 px-5 text-sm font-bold text-white/90 hover:bg-white/5"
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                Contact form
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
