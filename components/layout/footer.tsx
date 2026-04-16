"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Twitter, Youtube, Mail,
  ShieldCheck, CreditCard, Lock, ChevronRight,
} from "lucide-react";
import type { ContactSettings } from "@/lib/platform-settings-shared";
import { PLATFORM_SETTINGS_DEFAULTS } from "@/lib/platform-settings-shared";

/* ── Glass tokens (dynamic) ── */
const GLASS_SURFACE = "var(--glass-bg)";
const GLASS_BORDER = "var(--glass-border)";
const GLASS_BLUR = "var(--glass-blur)";
const GLASS_SHADOW = "var(--glass-shadow)";

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

export function Footer({ contact: contactProp }: { contact?: ContactSettings }) {
  const contact = contactProp ?? PLATFORM_SETTINGS_DEFAULTS.contact;

  return (
    <footer
      className="relative overflow-hidden text-[color:var(--color-text)]"
      style={{
        background: `
          radial-gradient(ellipse 70% 60% at 80% -10%, rgba(251,146,60,0.05) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.06) 0%, transparent 55%),
          var(--color-bg)
        `,
      }}
    >
      {/* Divider */}
      <div
        className="w-full opacity-40"
        style={{
          height: 1,
          background:
            "linear-gradient(90deg, transparent 5%, var(--glass-border) 40%, var(--glass-border) 60%, transparent 95%)",
        }}
      />

      {/* Glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full blur-[60px]"
          style={{ background: "rgba(251,146,60,0.06)" }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[50px]"
          style={{ background: "rgba(99,102,241,0.05)" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-6">

          {/* Brand */}
          <div className="lg:col-span-2 flex flex-col">

            <Link href="/" className="inline-block mb-7">
              <div
                className="relative overflow-hidden px-5 py-3.5 rounded-[22px]"
                style={{
                  background: GLASS_SURFACE,
                  backdropFilter: GLASS_BLUR,
                  border: `1px solid ${GLASS_BORDER}`,
                  boxShadow: GLASS_SHADOW,
                }}
              >
                <Image
                  src="/jimvio-logo.png"
                  alt="Jimvio"
                  width={120}
                  height={36}
                  className="h-8 w-auto"
                />
              </div>
            </Link>

            <p className="text-sm opacity-70 max-w-[270px] mb-8">
              The global creator-commerce ecosystem. One platform for verified suppliers, buyers, affiliates & influencers.
            </p>

            {/* Social */}
            <div className="flex gap-3 mb-7">
              {[
                { icon: <Twitter size={16} />, href: contact.social_x },
                { icon: <Youtube size={16} />, href: contact.social_youtube },
                { icon: <Mail size={16} />, href: `mailto:${contact.info_email}` },
              ].map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  target="_blank"
                  className="w-10 h-10 flex items-center justify-center rounded-full transition"
                  style={{
                    background: GLASS_SURFACE,
                    border: `1px solid ${GLASS_BORDER}`,
                  }}
                >
                  {s.icon}
                </a>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2">
              {[Lock, CreditCard, ShieldCheck].map((Icon, i) => (
                <span
                  key={i}
                  className="px-3 py-1 text-xs rounded-full flex items-center gap-1 opacity-70"
                  style={{
                    background: GLASS_SURFACE,
                    border: `1px solid ${GLASS_BORDER}`,
                  }}
                >
                  <Icon size={12} />
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-5">
            {Object.entries(footerLinks).map(([title, links]) => (
              <div
                key={title}
                className="p-5 rounded-[20px]"
                style={{
                  background: GLASS_SURFACE,
                  border: `1px solid ${GLASS_BORDER}`,
                  backdropFilter: GLASS_BLUR,
                }}
              >
                <h5 className="text-xs uppercase mb-4 opacity-60">
                  {title}
                </h5>

                <ul className="flex flex-col gap-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm flex items-center gap-1 opacity-70 hover:opacity-100 transition"
                      >
                        <ChevronRight size={12} />
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

      {/* Bottom */}
      <div
        className="py-6 text-xs flex flex-col md:flex-row justify-between items-center gap-4 opacity-70"
        style={{
          background: GLASS_SURFACE,
          borderTop: `1px solid ${GLASS_BORDER}`,
        }}
      >
        <p>© {new Date().getFullYear()} Jimvio</p>

        <div className="flex gap-4">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="#">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}