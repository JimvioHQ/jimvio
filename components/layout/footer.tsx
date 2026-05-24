
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
import JimvioLogo from "../ui/logo";

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
      <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6">
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
      <h5 className="font-semibold text-stone-600 mb-3.5">{title}</h5>
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
    label: "X / Twitter",
    href: contact.social_x || "https://x.com/Jimvio_Official",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: contact.social_youtube || "https://youtube.com/@jimvio",
    icon: <Youtube size={16} />,
  },
  {
    label: "Instagram",
    href: contact.social_instagram || "https://www.instagram.com/jimvio_official",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/jimvioofficial",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/jimvio/",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: contact.social_tiktok || "https://www.tiktok.com/@jimvio_official",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.2 8.2 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
      </svg>
    ),
  },
];

  return (
    <footer className="relative overflow-hidden bg-surface border-t border-border pb-[80px] md:pb-0">

      {/* Newsletter — theme-aware, no hardcoded dark background */}
      <NewsletterStrip />

      {/* Main grid */}
      <div className="relative z-10 mx-auto max-w-8xl px-3 sm:px-6 pt-12 pb-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2 flex flex-col">

            {/* Logo */}
            <div className="mb-3">
              <JimvioLogo href="/" size="xl" className="text-[36px] tracking-[0.03em]" />
            </div>

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
          <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-3">
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
          "rounded-md flex items-center gap-1 px-2 py-1 text-xs text-text-muted",
          "transition-[color,background] duration-150",
          "hover:text-text-primary"
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
        "hover:text-text-primary"
      )}>
      {label}
    </Link>
  );
}
