
"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Twitter, Youtube, Mail, TrendingUp,
  ShieldCheck, CreditCard, Lock,
  ChevronRight, ArrowRight, Circle,
  ArrowUpRight

} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactSettings } from "@/lib/platform-settings-shared";
import { PLATFORM_SETTINGS_DEFAULTS } from "@/lib/platform-settings-shared";
import { FieldInput } from "../ui/field-input";

// ── Data ─────────────────────────────────────────────────────────────────────

const footerLinks = {
  Marketplace: [
    { label: "Browse Products", href: "/marketplace" },
    { label: "Top Suppliers", href: "/vendors" },
    { label: "Post Buying Lead", href: "/requests/new" },
    { label: "Trade Assurance", href: "/protection" },
    { label: "Verified Exporters", href: "/verified" },
    { label: "Flash Deals", href: "/deals" },
  ],
  "Earn & Grow": [
    { label: "Affiliate Program", href: "/affiliates" },
    { label: "Influencer Hub", href: "/influencers" },
    { label: "Clips", href: "/clips" },
    { label: "Clippings", href: "/clippings" },
    { label: "Partner API", href: "/api" },
    { label: "Creator Studio", href: "/creator" },
  ],
  Resources: [
    { label: "Market Reports", href: "/reports" },
    { label: "Trade Guides", href: "/guides" },
    { label: "Blog", href: "/blog" },
    { label: "Help Center", href: "/help" },
    { label: "Webinars", href: "/webinars" },
    { label: "API Docs", href: "/docs" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
    { label: "Trust & Safety", href: "/safety" },
    { label: "Contact", href: "/contact" },
    { label: "Investor Relations", href: "/investors" },
  ],
};

const trustBadges = [
  { icon: ShieldCheck, label: "Trade Assurance Protected" },
  { icon: CreditCard, label: "Secure Payments" },
  { icon: Lock, label: "SSL Encrypted" },
];

type LegalLink = {
  label: string;
  href: string;
  external?: boolean;
};

const statusUrl = process.env.STATUS_WEBSITE_URL || "https://status.jimvio.com";

export const legalLinks: LegalLink[] = [
  { label: "Status", href: statusUrl, external: true },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
  { label: "Sitemap", href: "/sitemap.xml", external: true },
];

function NewsletterStrip() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmit] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email) setSubmit(true);
  }

  return (
    <div className="bg-surface border-b border-border">
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

          {/* Copy */}
          <div>
            <h2 className="text-base font-black tracking-[-0.03em] text-text-primary sm:text-lg">
              Stay ahead of the market
            </h2>
            <p className="mt-1 text-[13px] text-text-muted">
              Weekly trade insights, flash deals & platform updates — no spam.
            </p>
          </div>

          {/* Form / success */}
          {submitted ? (
            <div className="flex items-center gap-2 rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-5 py-3 text-sm font-semibold text-[var(--color-success)]">
              <ShieldCheck size={15} />
              You're in — check your inbox!
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex gap-2.5 flex-wrap sm:flex-nowrap"
            >
              <FieldInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className={cn(
                  "pl-3 rounded-full",
                  "h-[42px] w-full sm:w-[220px] rounded-md px-4 text-[13px] font-medium outline-none",
                )}
              />
              <button
                type="submit"
                className={cn(
                  "btn-premium h-[42px] bg-accent text-white hover:bg-accent-hover",
                  "shadow-[0_2px_8px_rgba(253,80,0,0.35)] hover:shadow-[0_4px_16px_rgba(253,80,0,0.4)]",
                  "hover:-translate-y-px"
                )}
              >
                Subscribe <ArrowRight size={14} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/** Single social icon button */
function SocialBtn({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center",
        "rounded-sm border-[1.5px] border-border bg-surface text-text-muted",
        "shadow-[var(--shadow-sm)]",
        "transition-all duration-[180ms]",
        "hover:border-accent hover:bg-accent-light hover:text-accent hover:-translate-y-0.5",
        "hover:shadow-[var(--shadow-md)]",
        "active:scale-95"
      )}
    >
      {children}
    </Link>
  );
}

/** Link column card */
function LinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="rounded-md border-0 border-border p-[18px] shadow-[var(--shadow-sm)]">
      <h5 className="home-section-eyebrow mb-3.5">{title}</h5>
      <ul className="flex flex-col gap-0.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className={cn(
                "group flex items-center gap-1.5 rounded py-[3px]",
                "text-[13px] font-normal text-text-secondary opacity-75",
                "transition-all duration-150",
                "hover:gap-2.5 hover:opacity-100 hover:text-accent"
              )}
            >
              <ChevronRight
                size={10}
                className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
              />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

export function Footer({ contact: contactProp }: { contact?: ContactSettings }) {
  const contact = contactProp ?? PLATFORM_SETTINGS_DEFAULTS.contact;

  const socials = [
    {
      label: "X / Twitter", href: contact.social_x,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    { label: "YouTube", href: contact.social_youtube, icon: <Youtube size={16} /> },
    { label: "Email", href: `mailto:${contact.info_email}`, icon: <Mail size={15} /> },
    {
      label: "TikTok", href: "#",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.24 8.24 0 0 0 4.81 1.54V6.78a4.85 4.85 0 0 1-1.04-.09z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="relative overflow-hidden bg-surface border-t border-border pb-[80px] md:pb-0">

      {/* Newsletter — theme-aware, no hardcoded dark background */}
      <NewsletterStrip />

      {/* Main grid */}
      <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 pt-12 pb-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-6">

          {/* ── Brand column ─────────────────────────────── */}
          <div className="lg:col-span-2 flex flex-col">

            {/* Logo */}
            <Link href="/" className="inline-flex items-center gap-0 mb-4 group w-fit">
              <Image
                src="/jimvio-logo.png"
                alt="Jimvio"
                width={56}
                height={56}
                className="h-11 w-auto mix-blend-multiply dark:mix-blend-normal brightness-110 contrast-110"
              />
              <span className="text-[36px] sm:text-[42px] font-black tracking-[-0.07em] leading-none select-none">
                <span className="text-text-primary">Jim</span>
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #fd5000 0%, #ff6a00 100%)",
                  }}
                >
                  vio
                </span>
              </span>
            </Link>

            <p className="text-[13px] leading-relaxed text-text-muted max-w-[260px] mb-6 font-normal">
              The global creator-commerce ecosystem. One platform for verified
              suppliers, buyers, affiliates & influencers.
            </p>

            {/* Socials */}
            <div className="flex gap-2 mb-6">
              {socials.map((s) => (
                <SocialBtn key={s.label} href={s.href} label={s.label}>
                  {s.icon}
                </SocialBtn>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex flex-col gap-2">
              {trustBadges.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className={cn(
                    "flex items-center gap-2.5 rounded-sm border-[1.5px] border-border",
                    "bg-surface-secondary px-3 py-2 text-xs font-medium text-text-secondary",
                    "shadow-[var(--shadow-sm)]"
                  )}
                >
                  {/* Live dot */}
                  <span className="relative flex h-[7px] w-[7px] shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
                    <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-success" />
                  </span>
                  <Icon size={12} className="text-text-muted shrink-0" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* ── Link columns ──────────────────────────────── */}
          <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(footerLinks).map(([title, links]) => (
              <LinkColumn key={title} title={title} links={links} />
            ))}
          </div>

        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Bottom bar */}
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} Jimvio Inc.
          </p>
          {/* Status pill */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border",
              "bg-surface-secondary px-2.5 py-1 text-[11px] font-semibold text-text-muted"
            )}
          >
            <span className="relative flex h-[5px] w-[5px]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-[5px] w-[5px] rounded-full bg-success" />
            </span>
            All systems operational
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {legalLinks.map((item, i) => (
            <LegalLinkItem key={i} label={item.label} href={item.href} external={item.external} />
          ))}
        </nav>
      </div>
    </footer>
  );
}


type Props = {
  label: string;
  href: string;
  external?: boolean;
};

export function LegalLinkItem({ label, href, external }: Props) {
  if (external) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "rounded flex items-center gap-1 px-2 py-1 text-xs text-text-muted",
          "transition-[color,background] duration-150",
          "hover:text-text-primary hover:bg-surface-secondary"
        )}
      >
        {label}
        <ArrowUpRight size={14} className="opacity-70" />
      </Link>
    );
  }

  return (
    <Link href={href}
      className={cn(
        "rounded flex items-center gap-1 px-2 py-1 text-xs text-text-muted",
        "transition-[color,background] duration-150",
        "hover:text-text-primary hover:bg-surface-secondary"
      )}>
      {label}
    </Link>
  );
}