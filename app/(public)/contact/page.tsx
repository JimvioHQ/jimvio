import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Clapperboard,
  Handshake,
  HelpCircle,
  Mail,
  MapPin,
  Megaphone,
  Scale,
  Store,
  Users,
} from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";
import { normalizeContactTopic } from "@/lib/contact/topics";
import { customerSupportEmail, supportNotificationRecipient } from "@/lib/contact-email";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";

const CHANNELS = [
  {
    icon: HelpCircle,
    title: "Customer support",
    body: "Account help, orders, payouts, and product questions.",
    href: "/help",
    cta: "Open Help Center",
  },
  {
    icon: Store,
    title: "Vendors & sellers",
    body: "Listing, verification, and marketplace seller questions.",
    href: "/contact?topic=vendor",
    cta: "Seller inquiry",
  },
  {
    icon: Clapperboard,
    title: "Creators & affiliates",
    body: "Campaigns, clipping, and affiliate program questions.",
    href: "/contact?topic=creator",
    cta: "Creator inquiry",
  },
  {
    icon: Handshake,
    title: "Partnerships & business",
    body: "Integrations, commercial partnerships, and B2B conversations.",
    href: "/contact?topic=partnerships",
    cta: "Partnership inquiry",
  },
  {
    icon: Megaphone,
    title: "Press & media",
    body: "Interviews, brand assets, and media requests.",
    href: "/press",
    cta: "Press kit",
  },
  {
    icon: Briefcase,
    title: "Investor inquiries",
    body: "Jimvio does not publish a public IR dossier. Use the contact form for investor questions.",
    href: "/contact?topic=investors",
    cta: "Investor inquiry",
  },
] as const;

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { contact } = await getResolvedPlatformSettings();
  const params = await searchParams;
  const initialTopic = normalizeContactTopic(params.topic);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[var(--color-bg)]">
      <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(135deg,#FFF8F4_0%,#FFF1E8_42%,#FFFFFF_100%)] dark:bg-[linear-gradient(135deg,#1a0f0a_0%,#120c09_100%)]">
        <div className="mx-auto max-w-8xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#FF5A1F]">
            Contact
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)] sm:text-5xl md:text-6xl">
            Talk with the Jimvio team
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
            Choose the right channel below, or send a message with the form. We use the published
            Jimvio contact emails — no invented phone numbers or office networks.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-8xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNELS.map(({ icon: Icon, title, body, href, cta }) => (
            <Link
              key={title}
              href={href}
              className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[rgba(255,90,31,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] dark:bg-[var(--color-surface)]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-base font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#C2410C]">
                {cta}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--color-border)] bg-white dark:bg-[var(--color-surface)]">
        <div className="mx-auto max-w-8xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Direct channels
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Prefer email? Use the addresses already published for Jimvio support and general
                inquiries.
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                    <Mail className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                      Support
                    </h3>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      Product, account, and payout questions.
                    </p>
                    <a
                      href={`mailto:${customerSupportEmail()}`}
                      className="mt-2 inline-block text-base font-bold text-[#FF5A1F] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
                    >
                      {customerSupportEmail()}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                    <Users className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                      General & partnerships
                    </h3>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      Press, partnerships, careers interest, and general company mail.
                    </p>
                    <a
                      href={`mailto:${supportNotificationRecipient(contact.info_email)}`}
                      className="mt-2 inline-block text-base font-bold text-[#FF5A1F] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
                    >
                      {supportNotificationRecipient(contact.info_email)}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-[var(--color-border)] bg-[#F8FAFC] text-[#111827] dark:bg-[var(--color-bg)] dark:text-[var(--color-text-primary)]">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                      Headquarters
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {contact.hq_line1}
                      <br />
                      {contact.hq_line2}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Link
                    href="/legal"
                    className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--color-border)] px-4 text-sm font-bold text-[#111827] hover:border-[rgba(255,90,31,0.35)] dark:text-[var(--color-text-primary)]"
                  >
                    <Scale className="h-4 w-4" aria-hidden="true" />
                    Legal Center
                  </Link>
                  <Link
                    href="/community-guidelines"
                    className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--color-border)] px-4 text-sm font-bold text-[#111827] hover:border-[rgba(255,90,31,0.35)] dark:text-[var(--color-text-primary)]"
                  >
                    Trust & Safety
                  </Link>
                  <Link
                    href="/cookie-settings"
                    className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--color-border)] px-4 text-sm font-bold text-[#111827] hover:border-[rgba(255,90,31,0.35)] dark:text-[var(--color-text-primary)]"
                  >
                    Cookie settings
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-[var(--color-border)] bg-[#F8FAFC] p-6 sm:p-8 dark:bg-[var(--color-bg)]">
              <h2 className="text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                Send a message
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Messages route to the appropriate Jimvio inbox based on topic.
              </p>
              <div className="relative mt-6">
                <ContactForm key={initialTopic} initialTopic={initialTopic} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
