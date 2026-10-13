import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Globe2,
  Heart,
  Layers,
  Mail,
  Shield,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { ABOUT_VALUES } from "@/lib/about/content";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";
import { cn } from "@/lib/utils";

/**
 * Verified open roles only. Keep empty until a real opening is approved —
 * never invent job listings for marketing.
 */
const OPEN_ROLES: Array<{
  title: string;
  team: string;
  location: string;
  category: string;
  applyHref: string;
}> = [];

const WHY_JIMVIO = [
  {
    icon: Compass,
    title: "Mission-driven product work",
    body: "Make earning online transparent, accessible, and rewarding for creators, sellers, brands, and businesses around the world.",
  },
  {
    icon: Layers,
    title: "One creator-commerce ecosystem",
    body: "Marketplace, affiliates, UGC & clipping, communities, commerce tools, and wallet payouts — shipped as one connected platform.",
  },
  {
    icon: Globe2,
    title: "Built for borderless opportunity",
    body: "Jimvio exists so talent and commerce are not limited by geography, audience size, or fragmented tools.",
  },
  {
    icon: Target,
    title: "Meaningful ownership",
    body: "Small, focused teams own outcomes end-to-end: clarity in product, quality in execution, and respect for the people who use Jimvio.",
  },
];

const HOW_WE_WORK = [
  {
    title: "Remote-first",
    body: "Jimvio is a globally distributed, remote-first team. Collaboration is designed for async writing, clear decisions, and reliable delivery.",
  },
  {
    title: "Ownership",
    body: "People closest to the problem ship the solution. We prefer accountable scope over handoffs and theater.",
  },
  {
    title: "Product quality",
    body: "From checkout to community tools, we sweat details users feel — speed, trust, clarity, and polish.",
  },
  {
    title: "Customer obsession",
    body: "Creators, sellers, affiliates, and buyers are the scoreboard. Features earn their place by helping people earn and operate with confidence.",
  },
];

const FAQS = [
  {
    q: "Is Jimvio remote-first?",
    a: "Yes. Official company documentation describes Jimvio as a globally distributed, remote-first team.",
  },
  {
    q: "Where is Jimvio based?",
    a: "Jimvio is a globally distributed, remote-first team and does not publish a headquarters address.",
  },
  {
    q: "Do you list every open role here?",
    a: "We only publish openings we can actually hire for. If no roles are listed, we are not currently advertising verified positions.",
  },
  {
    q: "How can I apply or share interest?",
    a: "Send a short note and relevant links to our info email. Mention the kind of work you want to do and any portfolio or GitHub links.",
  },
];

function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      {children}
    </section>
  );
}

export default async function CareersPage() {
  const { contact } = await getResolvedPlatformSettings();
  const applyEmail = contact.info_email;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[var(--color-bg)]">
      {/* Hero */}
      <Section className="relative overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(135deg,#FFF8F4_0%,#FFF1E8_42%,#FFFFFF_100%)] dark:bg-[linear-gradient(135deg,#1a0f0a_0%,#120c09_100%)]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_30%,rgba(255,90,31,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-8xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#FF5A1F]">
            Careers
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)] sm:text-5xl md:text-6xl">
            Build the platform behind{" "}
            <span className="text-[#FF5A1F]">global creator commerce</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
            Jimvio connects marketplace commerce, affiliates, UGC campaigns, communities, and
            payouts so creators and businesses can earn without juggling disconnected tools.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#open-roles"
              className="inline-flex h-12 items-center gap-2 rounded-[12px] bg-[#FF5A1F] px-6 text-sm font-bold text-white transition hover:bg-[#e04e18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
            >
              View open roles
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="#how-we-work"
              className="inline-flex h-12 items-center rounded-[12px] border border-[var(--color-border)] bg-white px-6 text-sm font-bold text-[#111827] transition hover:border-[rgba(255,90,31,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] dark:bg-[var(--color-surface)] dark:text-[var(--color-text-primary)]"
            >
              How we work
            </a>
          </div>
        </div>
      </Section>

      {/* Why Jimvio */}
      <Section className="mx-auto max-w-8xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
            Why Jimvio
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
            The work is concrete: remove barriers between ideas, audiences, and income — with
            transparent tools people can actually use.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {WHY_JIMVIO.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-[16px] border border-[var(--color-border)] bg-white p-6 dark:bg-[var(--color-surface)]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* How we work */}
      <Section
        id="how-we-work"
        className="border-y border-[var(--color-border)] bg-white dark:bg-[var(--color-surface)]"
      >
        <div className="mx-auto max-w-8xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="text-3xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
            How we work
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
            Principles grounded in how Jimvio already operates — not a fictional handbook.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_WE_WORK.map((item) => (
              <div key={item.title} className="rounded-[16px] border border-[var(--color-border)] bg-[#F8FAFC] p-5 dark:bg-[var(--color-bg)]">
                <h3 className="text-base font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Culture / values from About */}
      <Section className="mx-auto max-w-8xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
              Culture & values
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
              The same brand values published on About Jimvio guide how we hire and ship.
            </p>
          </div>
          <Link
            href="/about#values"
            className="text-sm font-semibold text-[#C2410C] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
          >
            Read full values →
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ABOUT_VALUES.map((value) => (
            <div
              key={value.title}
              className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 dark:bg-[var(--color-surface)]"
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                {value.title.startsWith("Trust") ? (
                  <Shield className="h-4 w-4" aria-hidden="true" />
                ) : value.title.startsWith("Creator") ? (
                  <Heart className="h-4 w-4" aria-hidden="true" />
                ) : value.title.startsWith("Accessible") ? (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                ) : value.title.startsWith("Continuous") ? (
                  <Zap className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Users className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <h3 className="text-base font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                {value.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {value.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Open roles */}
      <Section id="open-roles" className="border-t border-[var(--color-border)] bg-white dark:bg-[var(--color-surface)]">
        <div className="mx-auto max-w-8xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="text-3xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
            Open roles
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
            We only list positions that are actively open. No placeholder jobs.
          </p>

          {OPEN_ROLES.length === 0 ? (
            <div className="mt-10 rounded-[20px] border border-[var(--color-border)] bg-[#F8FAFC] px-6 py-12 text-center dark:bg-[var(--color-bg)] sm:px-10">
              <p className="text-lg font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                No current openings
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
                We are not advertising verified roles right now. If you believe your experience
                fits Jimvio&apos;s mission, you are welcome to introduce yourself for future
                consideration.
              </p>
              <a
                href={`mailto:${applyEmail}?subject=${encodeURIComponent("Jimvio careers — general interest")}`}
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-[12px] bg-[#FF5A1F] px-6 text-sm font-bold text-white transition hover:bg-[#e04e18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Email {applyEmail}
              </a>
            </div>
          ) : (
            <ul className="mt-10 space-y-3">
              {OPEN_ROLES.map((role) => (
                <li key={role.title}>
                  <a
                    href={role.applyHref}
                    className="group flex flex-col gap-4 rounded-[16px] border border-[var(--color-border)] bg-[#F8FAFC] p-6 transition hover:border-[rgba(255,90,31,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] dark:bg-[var(--color-bg)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#FF5A1F] dark:text-[var(--color-text-primary)]">
                          {role.title}
                        </h3>
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:bg-[var(--color-surface)]">
                          {role.category}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-[var(--color-text-muted)]">
                        {role.team} · {role.location}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-[#C2410C]">
                      Apply
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      {/* CTA */}
      <Section className="mx-auto max-w-8xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[20px] bg-[#111827] px-6 py-10 text-white sm:px-10">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            Interested in building with us?
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
            Tell us what you ship, what you care about, and how you want to help creators and
            businesses earn on Jimvio.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`mailto:${applyEmail}?subject=${encodeURIComponent("Jimvio careers")}`}
              className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#FF5A1F] px-5 text-sm font-bold text-white hover:bg-[#e04e18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Contact hiring
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link
              href="/about"
              className="inline-flex h-11 items-center rounded-[12px] border border-white/20 px-5 text-sm font-bold text-white/90 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              About Jimvio
            </Link>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section className="border-t border-[var(--color-border)] bg-white dark:bg-[var(--color-surface)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-3xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
            FAQ
          </h2>
          <dl className="mt-8 space-y-6">
            {FAQS.map((item) => (
              <div key={item.q}>
                <dt className="text-base font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                  {item.q}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>
    </div>
  );
}
