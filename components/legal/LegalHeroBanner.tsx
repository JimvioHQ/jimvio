import Link from "next/link";
import { ChevronRight, Globe2, Lock, ShieldCheck } from "lucide-react";
import { type LegalDocument } from "@/lib/legal/catalog";
import { cn } from "@/lib/utils";
import { LegalEyebrow } from "./legal-ui";
import { LegalIllustration } from "./LegalIllustration";

type Props = {
  document?: LegalDocument;
  mode?: "document" | "hub";
  className?: string;
};

function splitTitle(title: string) {
  const parts = title.trim().split(/\s+/);
  if (parts.length === 1) return { lead: title, accent: "" };
  return {
    lead: parts.slice(0, -1).join(" "),
    accent: parts[parts.length - 1],
  };
}

export function LegalHeroBanner({ document, mode = "document", className }: Props) {
  const isHub = mode === "hub" || !document;
  const title = isHub ? "Legal Center" : document.title;
  const { lead, accent } = splitTitle(title);
  const description = isHub
    ? "Clear, fair policies for everyone. Everything you need to know about using Jimvio. Transparent, simple and easy to understand."
    : document.description;

  const crumbs = isHub
    ? [
        { label: "Home", href: "/" },
        { label: "Legal Center", href: "/legal" },
      ]
    : [
        { label: "Home", href: "/" },
        { label: "Legal Center", href: "/legal" },
        { label: document.title, href: document.href },
      ];

  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-[rgba(255,90,31,0.12)]",
        "bg-[linear-gradient(135deg,#FFF8F4_0%,#FFF1E8_45%,#F8FAFC_100%)]",
        "dark:bg-[linear-gradient(135deg,#1a0f0a_0%,#120c09_50%,#0b0b0f_100%)]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-[rgba(255,90,31,0.12)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-[rgba(255,90,31,0.1)] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-8xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <nav aria-label="Breadcrumb" className="mb-5">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            {crumbs.map((crumb, index) => (
              <li key={`${crumb.href}-${crumb.label}`} className="inline-flex items-center gap-1.5">
                {index > 0 ? <ChevronRight className="h-3 w-3" aria-hidden="true" /> : null}
                {index === crumbs.length - 1 ? (
                  <span className="font-medium text-[var(--color-text-secondary)]">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-2xl">
            <LegalEyebrow>Jimvio Legal Center</LegalEyebrow>
            <h1 className="mt-2 flex items-start gap-3 text-[clamp(2rem,5vw,3.25rem)] font-black leading-[1.05] tracking-[-0.04em] text-[#111827] dark:text-[var(--color-text-primary)]">
              {isHub ? (
                <span
                  className="mt-1.5 inline-block h-[0.9em] w-1.5 shrink-0 rounded-full bg-[#FF5A1F] sm:mt-2"
                  aria-hidden="true"
                />
              ) : null}
              <span>
                {lead}
                {accent ? (
                  <>
                    {" "}
                    <span className="text-[#FF5A1F]">{accent}</span>
                  </>
                ) : null}
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
              {isHub ? (
                <>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    Clear, fair policies for everyone.{" "}
                  </span>
                  {description.replace("Clear, fair policies for everyone. ", "")}
                </>
              ) : (
                <>
                  Clear rules. Fair usage. A safer creator commerce ecosystem for everyone,
                  everywhere.
                </>
              )}
            </p>

            {isHub ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { icon: ShieldCheck, label: "Safe" },
                  { icon: ScaleIcon, label: "Fair" },
                  { icon: Globe2, label: "Transparent" },
                ].map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,90,31,0.2)] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] dark:bg-[var(--color-surface)]/80"
                  >
                    <item.icon className="h-3.5 w-3.5 text-[#FF5A1F]" aria-hidden="true" />
                    {item.label}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Transparent & Fair",
                    subtitle: "Easy to understand",
                  },
                  {
                    icon: Globe2,
                    title: "Globally Accessible",
                    subtitle: "Readable on any device",
                  },
                  {
                    icon: Lock,
                    title: "Always Up to Date",
                    subtitle: document.version ? `Version ${document.version}` : "Latest version",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center gap-3 rounded-[14px] border border-white/80 bg-white/80 p-3.5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] sm:block dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]/80"
                  >
                    <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F] sm:mb-2">
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                        {item.title}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative hidden justify-self-end md:block">
            <LegalIllustration className={isHub ? "h-[180px] w-[200px] lg:h-[220px] lg:w-[250px]" : undefined} />
            {!isHub ? (
              <div className="absolute bottom-2 left-2 max-w-[220px] rounded-[16px] border border-white/80 bg-white/90 p-3.5 shadow-[0_8px_24px_rgba(17,24,39,0.08)] backdrop-blur dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]/90">
                <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  “Trust built with clear rules.”
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex -space-x-2" aria-hidden="true">
                    {["#FF5A1F", "#FB923C", "#FDBA74"].map((color) => (
                      <span
                        key={color}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        J
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                    — The Jimvio Team
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="md:hidden">
            <LegalIllustration compact className="mx-auto opacity-90" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ScaleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3v18M7 7l-4 7h8L7 7zm10 0l-4 7h8l-4-7zM5 21h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
