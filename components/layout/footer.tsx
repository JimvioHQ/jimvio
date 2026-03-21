"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Twitter, Youtube, Linkedin, Mail, Facebook,
  ShieldCheck, CreditCard, Lock, ArrowUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactSettings } from "@/lib/platform-settings-shared";
import { PLATFORM_SETTINGS_DEFAULTS } from "@/lib/platform-settings-shared";

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
    { label: "Communities", href: "/communities" },
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
    <footer className="bg-white text-text-primary pt-20 border-t border-[#f0f0f0]">
      <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-12 pb-16">
        <div className="lg:col-span-2">
          <Link href="/" className="mb-6 block transition-transform hover:scale-105 active:scale-95 origin-left">
            <Image 
              src="/jimvio-logo.png" 
              alt="Jimvio" 
              width={140} 
              height={40} 
              className="h-9 w-auto object-contain"
            />
          </Link>
          <p className="text-[14px] text-[#6b7280] leading-[1.7] max-w-[280px] mb-8 font-medium">
            The global creator-commerce ecosystem. One platform for verified suppliers, buyers, affiliates & influencers.
          </p>
          <div className="flex gap-3 mb-8">
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
                className="w-10 h-10 bg-[#fafafa] border border-[#f0f0f0] rounded-lg flex items-center justify-center text-[#9ca3af] hover:bg-[#f97316] hover:border-[#f97316] hover:text-white transition-all shadow-sm"
              >
                {s.icon}
              </a>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: <Lock className="h-3 w-3" />, label: "SSL" },
              { icon: <CreditCard className="h-3 w-3" />, label: "PCI" },
              { icon: <ShieldCheck className="h-3 w-3" />, label: "ISO" },
            ].map(l => (
              <span key={l.label} className="px-3 py-1 bg-[#fafafa] border border-[#f0f0f0] rounded-md text-[10px] text-[#9ca3af] flex items-center gap-1.5 font-bold capitalize tracking-wider">
                {l.icon} {l.label}
              </span>
            ))}
          </div>
        </div>

        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title} className="lg:col-span-1">
            <h5 className="text-[11px] font-black text-[#9ca3af] capitalize tracking-[0.2em] mb-8">
              {title}
            </h5>
            <ul className="flex flex-col gap-4">
              {links.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href} 
                    className="text-[14px] text-[#4b5563] hover:text-[#f97316] transition-colors font-semibold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[#f0f0f0] bg-[#fafafa] py-10 w-full">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[12px] text-[#9ca3af] font-bold capitalize tracking-[0.15em]">
            © {new Date().getFullYear()} Jimvio, Inc. · Built for Global Commerce · Kigali 🇷🇼
          </p>
          <div className="flex gap-8">
            <Link href="/privacy" className="text-[12px] text-[#9ca3af] hover:text-[#f97316] transition-colors font-bold capitalize tracking-widest">Privacy Policy</Link>
            <Link href="/terms" className="text-[12px] text-[#9ca3af] hover:text-[#f97316] transition-colors font-bold capitalize tracking-widest">Terms</Link>
            <Link href="#" className="text-[12px] text-[#9ca3af] hover:text-[#f97316] transition-colors font-bold capitalize tracking-widest">Cookies</Link>
            <Link href="#" className="text-[12px] text-[#9ca3af] hover:text-[#f97316] transition-colors font-bold capitalize tracking-widest">Sitemap</Link>
          </div>
        </div>
      </div>

      {/* Utilities */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 w-12 h-12 bg-[#f97316] text-white rounded-full flex items-center justify-center shadow-2xl shadow-[#f97316]/40 hover:shadow-[#f97316]/60 hover:-translate-y-1.5 transition-all z-[200] active:scale-95"
      >
        <ArrowUp className="h-6 w-6 stroke-[3px]" />
      </button>
    </footer>
  );
}
