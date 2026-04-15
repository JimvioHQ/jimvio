"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Twitter, Youtube, Mail,
  ShieldCheck, CreditCard, Lock, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactSettings } from "@/lib/platform-settings-shared";
import { PLATFORM_SETTINGS_DEFAULTS } from "@/lib/platform-settings-shared";

/* ── Shared glass tokens ── */
const GLASS_SURFACE = "rgba(255,255,255,0.72)";
const GLASS_BORDER = "rgba(255,255,255,0.88)";
const GLASS_BLUR = "blur(40px) saturate(180%) brightness(105%)";
const GLASS_SHADOW = "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(255,255,255,0.3)";

const footerLinks = {
  "Marketplace": [
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
  "Resources": [
    { label: "Market Reports", href: "/reports" },
    { label: "Trade Guides", href: "/guides" },
    { label: "Blog", href: "/blog" },
    { label: "Help Center", href: "/help" },
    { label: "Webinars", href: "/webinars" },
    { label: "API Docs", href: "/docs" },
  ],
  "Company": [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
    { label: "Trust & Safety", href: "/safety" },
    { label: "Contact", href: "/contact" },
    { label: "Investor Relations", href: "/investors" },
  ],
};

export function Footer({ contact: contactProp }: { contact?: ContactSettings }) {
  const contact = contactProp ?? PLATFORM_SETTINGS_DEFAULTS.contact;

  return (
    <footer
      className="relative overflow-hidden"
      style={{
        /* Warm stone base with refined radial atmosphere */
        background: `
          radial-gradient(ellipse 70% 60% at 80% -10%, rgba(251,146,60,0.05) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.06) 0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at 50% 50%, rgba(255,255,255,0.7) 0%, transparent 100%),
          #f8f7f5
        `,
      }}
    >
      {/* ── Top glass divider ── */}
      <div
        className="w-full"
        style={{
          height: 1,
          background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0.7) 60%, transparent 95%)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.5)",
        }}
      />

      {/* Big ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(251,146,60,0.06), transparent 65%)", filter: "blur(60px)" }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.05), transparent 65%)", filter: "blur(50px)" }} />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(251,146,60,0.04), transparent 65%)", filter: "blur(40px)" }} />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-6">

          {/* ── Brand column ── */}
          <div className="lg:col-span-2 flex flex-col">

            {/* Logo glass card */}
            <Link href="/" className="inline-block mb-7 self-start transition-all hover:scale-105 active:scale-95 origin-left">
              <div
                className="relative overflow-hidden px-5 py-3.5 rounded-[22px]"
                style={{
                  background: GLASS_SURFACE,
                  backdropFilter: GLASS_BLUR,
                  WebkitBackdropFilter: GLASS_BLUR,
                  border: `1px solid ${GLASS_BORDER}`,
                  boxShadow: GLASS_SHADOW,
                }}
              >
                {/* Specular diagonal */}
                <div className="absolute -top-1/2 -left-1/4 w-3/4 h-3/4 rotate-[-25deg]"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 60%)" }} />
                {/* Orange ambient */}
                <div className="absolute bottom-0 right-0 w-16 h-16 rounded-full blur-2xl"
                  style={{ background: "rgba(251,146,60,0.12)" }} />
                <Image
                  src="/jimvio-logo.png"
                  alt="Jimvio"
                  width={120}
                  height={36}
                  className="relative z-10 h-8 w-auto object-contain"
                />
              </div>
            </Link>

            <p className="text-[13px] text-stone-500 leading-[1.75] max-w-[270px] mb-8 font-medium">
              The global creator-commerce ecosystem. One platform for verified suppliers, buyers, affiliates & influencers.
            </p>

            {/* Social — glass pill buttons */}
            <div className="flex gap-2.5 mb-7">
              {[
                { icon: <Twitter className="h-4 w-4" />, label: "X", href: contact.social_x },
                { icon: <Youtube className="h-4 w-4" />, label: "YouTube", href: contact.social_youtube },
                { icon: <Mail className="h-4 w-4" />, label: "Email", href: `mailto:${contact.info_email}` },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative overflow-hidden w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
                  style={{
                    background: GLASS_SURFACE,
                    backdropFilter: GLASS_BLUR,
                    WebkitBackdropFilter: GLASS_BLUR,
                    border: `1px solid ${GLASS_BORDER}`,
                    boxShadow: GLASS_SHADOW,
                    color: "#78716c",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "rgba(251,146,60,0.12)";
                    el.style.borderColor = "rgba(249,115,22,0.35)";
                    el.style.color = "#ea580c";
                    el.style.boxShadow = "0 4px 14px rgba(249,115,22,0.12), inset 0 1px 0 rgba(255,255,255,0.9)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = GLASS_SURFACE;
                    el.style.borderColor = GLASS_BORDER;
                    el.style.color = "#78716c";
                    el.style.boxShadow = GLASS_SHADOW;
                  }}
                >
                  {/* Inner specular */}
                  <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 50%)" }} />
                  <span className="relative z-10">{s.icon}</span>
                </a>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: <Lock className="h-3 w-3" />, label: "SSL Secured" },
                { icon: <CreditCard className="h-3 w-3" />, label: "PCI DSS" },
                { icon: <ShieldCheck className="h-3 w-3" />, label: "ISO 27001" },
              ].map((l) => (
                <span
                  key={l.label}
                  className="relative overflow-hidden px-3 py-1.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5 uppercase tracking-wider text-stone-400"
                  style={{
                    background: GLASS_SURFACE,
                    backdropFilter: "blur(20px) saturate(160%)",
                    WebkitBackdropFilter: "blur(20px) saturate(160%)",
                    border: `1px solid ${GLASS_BORDER}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1)",
                  }}
                >
                  {/* Specular */}
                  <div className="absolute inset-x-0 top-0 h-px rounded-full" style={{ background: "rgba(255,255,255,0.9)" }} />
                  <span className="relative z-10 flex items-center gap-1.5">{l.icon}{l.label}</span>
                </span>
              ))}
            </div>
          </div>

          {/* ── Link columns — wrapped in glass panels ── */}
          <div className="lg:col-span-4">
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {Object.entries(footerLinks).map(([title, links]) => (
                <div
                  key={title}
                  className="relative overflow-hidden rounded-[24px] p-5"
                  style={{
                    background: GLASS_SURFACE,
                    backdropFilter: "blur(32px) saturate(170%) brightness(104%)",
                    WebkitBackdropFilter: "blur(32px) saturate(170%) brightness(104%)",
                    border: `1px solid ${GLASS_BORDER}`,
                    boxShadow: GLASS_SHADOW,
                  }}
                >
                  {/* Specular shine */}
                  <div className="pointer-events-none absolute -top-1/2 -left-1/4 w-3/4 h-3/4 rotate-[-25deg]"
                    style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 55%)" }} />
                  {/* Orange bottom-right glow */}
                  <div className="pointer-events-none absolute bottom-0 right-0 w-24 h-24 rounded-full blur-2xl"
                    style={{ background: "rgba(251,146,60,0.08)" }} />

                  <h5 className="relative z-10 mb-4 text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">
                    {title}
                  </h5>
                  <ul className="relative z-10 flex flex-col gap-2.5">
                    {links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="text-[12px] font-medium text-stone-600 transition-all hover:text-orange-600 flex items-center gap-1 group/link"
                        >
                          <ChevronRight className="h-3 w-3 text-stone-300 group-hover/link:text-orange-400 group-hover/link:translate-x-0.5 transition-all shrink-0" />
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar — heavy glass strip ── */}
      <div className="relative z-10">
        {/* Top divider */}
        <div className="w-full h-px" style={{ background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.8) 40%, rgba(255,255,255,0.6) 60%, transparent 95%)" }} />

        <div
          className="relative overflow-hidden py-7"
          style={{
            background: "rgba(255,255,255,0.60)",
            backdropFilter: "blur(32px) saturate(180%) brightness(104%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%) brightness(104%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,1)",
          }}
        >
          {/* Bottom specular sweep */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,1) 50%, transparent)" }} />

          <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-5 px-4 sm:px-6 md:flex-row">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400 md:text-left">
              © {new Date().getFullYear()} Jimvio, Inc. · Built for Global Commerce
            </p>
            <div className="grid w-full max-w-md grid-cols-2 gap-x-6 gap-y-2.5 text-center sm:flex sm:max-w-none sm:flex-wrap sm:justify-end sm:gap-x-6 sm:gap-y-0 sm:text-left">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "Cookies", href: "#" },
                { label: "Sitemap", href: "#" },
              ].map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 transition-colors hover:text-orange-500"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
}
