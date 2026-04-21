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
    <footer className="relative overflow-hidden text-[color:var(--color-text)] bg-surface border-t border-border">

      {/* Content */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-6">

          {/* Brand */}
          <div className="lg:col-span-2 flex flex-col">

            <Link href="/" className="inline-block mb-7">
              <div className="px-4 py-3 rounded-lg border border-border bg-stone-50 dark:bg-stone-900 inline-block">
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
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-stone-50 dark:bg-stone-900 hover:bg-orange-50 hover:border-orange-200 transition-colors text-stone-500 hover:text-orange-600"
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
                  className="px-3 py-1 text-xs rounded-md flex items-center gap-1 border border-border bg-stone-50 dark:bg-stone-900 text-stone-500 dark:text-stone-400"
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
                className="p-5 rounded-lg bg-stone-50 dark:bg-stone-900 border border-border"
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
