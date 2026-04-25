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
    <footer className="relative overflow-hidden text-[color:var(--color-text)] bg-surface border-t border-border pb-[80px] md:pb-0">

      {/* Content */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-6">

          {/* Brand */}
          <div className="lg:col-span-2 flex flex-col">

            <Link href="/" className="inline-flex items-center gap-0 mb-7 group">
              <Image
                src="/jimvio-logo.png"
                alt="Jimvio"
                width={64}
                height={64}
                className="h-12 sm:h-14 w-auto mix-blend-multiply dark:mix-blend-normal brightness-110 contrast-110"
              />
              <span className="text-[36px] sm:text-[48px] font-black tracking-[-0.07em] select-none">
                <span className="text-stone-950 dark:text-white">Jim</span>
                <span className="bg-gradient-to-br from-[#fd5000] via-[#fd5000] to-[#ff6a00] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(253,80,0,0.12)]">
                  vio
                </span>
              </span>
            </Link>

            <p className="text-[13px] leading-relaxed text-stone-500 dark:text-stone-400 max-w-[280px] mb-8 font-medium">
              The global creator-commerce ecosystem. One platform for verified suppliers, buyers, affiliates & influencers.
            </p>

            {/* Social */}
            <div className="flex gap-2.5 mb-7">
              {[
                { icon: <Twitter size={18} />, href: contact.social_x },
                { icon: <Youtube size={18} />, href: contact.social_youtube },
                { icon: <Mail size={18} />, href: `mailto:${contact.info_email}` },
              ].map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  target="_blank"
                  className="w-10 h-10 flex items-center justify-center rounded-none border border-border bg-white dark:bg-stone-900 hover:border-orange-500 hover:text-orange-500 transition-all duration-300 active:scale-90 shadow-sm"
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
                  className="px-3 py-1 text-xs rounded-none flex items-center gap-1 border border-border bg-stone-50 dark:bg-stone-900 text-stone-500 dark:text-stone-400"
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
                className="p-5 rounded-none bg-stone-50 dark:bg-stone-900 border border-border"
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
      <div className="py-5 text-xs flex flex-col md:flex-row justify-between items-center gap-4 px-4 sm:px-6 max-w-[1280px] mx-auto text-stone-500 border-t border-border">
        <p>Â© {new Date().getFullYear()} Jimvio</p>

        <div className="flex gap-4">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="#">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}

