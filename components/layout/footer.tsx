
"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Youtube,
  ShieldCheck, CreditCard, Lock,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactSettings } from "@/lib/platform-settings-shared";
import { PLATFORM_SETTINGS_DEFAULTS } from "@/lib/platform-settings-shared";
import { JIMVIO_INSTAGRAM_URL, JIMVIO_LINKEDIN_URL, JIMVIO_TIKTOK_URL } from "@/lib/brand/social";
import { FOOTER_COLUMNS, getFooterUtilityLinks } from "@/lib/navigation/public-footer";
import { FieldInput } from "../ui/field-input";
import JimvioLogo from "../ui/logo";

const trustBadges = [
  { icon: ShieldCheck, label: "Trade Assurance" },
  { icon: CreditCard, label: "Secure Payments" },
  { icon: Lock, label: "SSL Encrypted" },
];

type LegalLink = {
  label: string;
  href: string;
  external?: boolean;
};

/** Bottom legal bar — cookies sit immediately after About Us. */
export const legalLinks: LegalLink[] = getFooterUtilityLinks();

function NewsletterStrip() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmit] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email) setSubmit(true);
  }

  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto max-w-8xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-[-0.02em] text-text-primary sm:text-lg">
              Stay ahead of the market
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-text-muted">
              Weekly trade insights, flash deals & platform updates — no spam.
            </p>
          </div>

          {submitted ? (
            <div className="flex items-center gap-2 rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--color-success)]">
              <ShieldCheck size={15} />
              You&apos;re in — check your inbox!
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
            >
              <FieldInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                aria-label="Email address"
                className="h-[42px] w-full rounded-md px-4 pl-3 text-[13px] font-medium sm:w-[220px]"
              />
              <button
                type="submit"
                className={cn(
                  "btn-premium inline-flex h-[42px] shrink-0 items-center justify-center gap-1.5 bg-accent px-4 text-white hover:bg-accent-hover",
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
        "flex h-8 w-8 items-center justify-center",
        "rounded-md border border-border bg-surface text-text-muted",
        "transition-colors duration-150",
        "hover:border-text-muted hover:text-text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
      )}
    >
      {children}
    </Link>
  );
}

function LinkColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <nav aria-label={title} className="min-w-0">
      <h3 className="mb-3 text-[13px] font-semibold tracking-[-0.01em] text-text-primary">
        {title}
      </h3>
      <ul className="flex flex-col">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className={cn(
                "block py-1.5 text-[13px] leading-5 text-text-secondary",
                "transition-colors duration-150",
                "hover:text-text-primary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer({ contact: contactProp }: { contact?: ContactSettings }) {
  const contact = contactProp ?? PLATFORM_SETTINGS_DEFAULTS.contact;
  const utilityLinks = getFooterUtilityLinks();

  const socials = [
    {
      label: "X / Twitter",
      href: contact.social_x || "https://x.com/Jimvio_Official",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
    {
      label: "YouTube",
      href: contact.social_youtube || "https://youtube.com/@jimvio",
      icon: <Youtube size={15} aria-hidden />,
    },
    {
      label: "Instagram",
      href: JIMVIO_INSTAGRAM_URL,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
    },
    {
      label: "Facebook",
      href: "https://www.facebook.com/jimvioofficial",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
    },
    {
      label: "LinkedIn",
      href: JIMVIO_LINKEDIN_URL,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
    },
    {
      label: "TikTok",
      href: JIMVIO_TIKTOK_URL,
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.2 8.2 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
        </svg>
      ),
    },
  ];

  return (
    <footer className="relative overflow-x-hidden border-t border-border bg-surface pb-[80px] md:pb-0">
      <NewsletterStrip />

      <div className="mx-auto max-w-8xl px-4 pb-8 pt-8 sm:px-6 sm:pt-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-4">
            <div className="mb-3">
              <JimvioLogo href="/" size="xl" className="text-[36px] tracking-[0.03em]" />
            </div>

            <p className="mb-5 max-w-[280px] text-[13px] font-normal leading-relaxed text-text-muted">
              Marketplace, affiliate links, brand briefs, and communities — without juggling five apps.
            </p>

            <div className="mb-5 flex flex-wrap gap-2">
              {socials.map((s) => (
                <SocialBtn key={s.label} href={s.href} label={s.label}>
                  {s.icon}
                </SocialBtn>
              ))}
            </div>

            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {trustBadges.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium leading-4 text-text-muted"
                >
                  <Icon size={13} strokeWidth={1.75} className="shrink-0" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:col-span-8">
            {FOOTER_COLUMNS.map((column) => (
              <LinkColumn key={column.title} title={column.title} links={column.links} />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border" />

      <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <p className="text-xs text-text-muted">
          © {new Date().getFullYear()} Jimvio Inc.
        </p>

        <nav aria-label="Utility" className="flex flex-wrap items-center">
          {utilityLinks.map((item, i) => (
            <span key={item.label} className="inline-flex items-center">
              {i > 0 ? (
                <span aria-hidden className="px-1 text-[11px] text-text-muted">
                  |
                </span>
              ) : null}
              <LegalLinkItem label={item.label} href={item.href} external={item.external} />
            </span>
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
  const className = cn(
    "rounded-md px-1.5 py-1 text-xs text-text-muted",
    "transition-colors duration-150",
    "hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
  );

  if (external) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
