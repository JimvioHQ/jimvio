"use client";

import { useState } from "react";
import { ArrowRight, Users, MessageCircle, Zap, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const COMMUNITIES = [
  {
    name: "Tech Founders",
    category: "Founders",
    members: "2.4K",
    description: "Early-stage founders sharing distribution tactics, fundraising intel, and product feedback. Weekly office hours with operators who've scaled to $10M+ ARR.",
    tags: ["SaaS", "Distribution", "Fundraising", "Product"],
  },
  {
    name: "Creator Economy",
    category: "Creators",
    members: "5.1K",
    description: "UGC creators, influencers, and brand partners exchanging campaign briefs, rate cards, and platform algorithm updates. Direct access to brand partnership managers.",
    tags: ["UGC", "Brand Deals", "TikTok", "Instagram"],
  },
  {
    name: "E-Commerce Operators",
    category: "Operators",
    members: "1.8K",
    description: "DTC brand operators and marketplace sellers discussing CRO, supply chain, paid social, and retention. Real numbers, no theory — screenshots welcome.",
    tags: ["DTC", "Amazon", "Meta Ads", "Retention"],
  },
  {
    name: "Affiliate Marketers",
    category: "Affiliates",
    members: "3.2K",
    description: "Performance marketers sharing winning angles, landers, and traffic sources. Focus on compliant scaling across TikTok Shop, Meta, and native.",
    tags: ["TikTok Shop", "Native", "Compliance", "Scaling"],
  },
  {
    name: "Product Builders",
    category: "Builders",
    members: "950",
    description: "Engineers and designers shipping consumer products. Design critiques, tech stack debates, and launch checklists. Build in public, get real feedback.",
    tags: ["Design", "Engineering", "Launch", "Feedback"],
  },
  {
    name: "Global Sellers",
    category: "Sellers",
    members: "4.3K",
    description: "Cross-border sellers navigating logistics, compliance, and localization. From Yiwu sourcing to EU VAT — practical intel for scaling internationally.",
    tags: ["Sourcing", "Logistics", "Compliance", "Localization"],
  },
];

export function CommunitiesSection() {
  return (
    <section className="relative bg-[#122019] py-16 sm:py-24">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(253,80,0,0.04)_0%,transparent_60%)]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-normal uppercase tracking-[0.12em] text-[#FD5000]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FD5000] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FD5000]" />
              </span>
              Communities
            </span>
            <h2 className="mt-3 font-['var(--font-fraunces)'] text-[30px] font-bold leading-[1.1] tracking-tight text-[#F3EFE4] sm:text-[38px] lg:text-[44px]">
              Where builders, creators & sellers grow together
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#a0ada5]">
              Join 17K+ members across 6 focused communities. Ask questions, share wins, find partners.
            </p>
          </div>

          <a
            href="/communities"
            className="hidden font-mono text-sm text-[#FD5000] transition-colors hover:text-[#ff7a2e] sm:inline-flex"
          >
            All communities →
          </a>
        </div>

        {/* Communities Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COMMUNITIES.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: i * 0.08 }}
            >
              <a
                href={`/communities/${c.name.toLowerCase().replace(/\s+/g, "-")}`}
                className={cn(
                  "group relative flex h-full flex-col rounded-2xl overflow-hidden border border-white/10 bg-[#122019] hover:border-[#FD5000]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#FD5000]/5",
                  i === 0 && "border-[#FD5000]/20"
                )}
                aria-label={`Join ${c.name} community`}
              >
                {/* Top row: name/category + member count */}
                <div className="flex items-start justify-between p-6 lg:p-7">
                  <div>
                    <h3 className="font-display font-semibold text-2xl lg:text-3xl tracking-tight text-[#F3EFE4] group-hover:text-[#FD5000] transition-colors">
                      {c.name}
                    </h3>
                    <div className="mt-2">
                      <span className="font-mono text-[10px] tracking-[0.1em] uppercase px-2 py-0.5 rounded bg-[#FD5000]/10 text-[#FD5000]/90">
                        {c.category}
                      </span>
                    </div>
                  </div>
                  <span className={cn(
                    "flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-mono font-medium border backdrop-blur-sm",
                    i === 0
                      ? "bg-[#FD5000]/10 text-[#FD5000] border-[#FD5000]/20"
                      : "bg-[#122019]/60 text-[#F3EFE4]/60 border-[#F3EFE4]/8"
                  )}>
                    <Users size={12} /> {c.members}
                  </span>
                </div>

                {/* Description */}
                <p className="px-6 lg:px-7 text-[#F3EFE4]/60 font-body text-sm lg:text-base leading-[1.75] mb-6">
                  {c.description}
                </p>

                {/* Bottom: tags + CTA */}
                <div className="px-6 lg:px-7 pb-6 lg:pb-7">
                  <div className="flex flex-wrap gap-2 mb-5">
                    {c.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[10px] tracking-wide px-2.5 py-1 rounded-md bg-[#122019] border border-[#F3EFE4]/8 text-[#F3EFE4]/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-sm font-body font-semibold text-[#FD5000] group-hover:translate-x-1.5 transition-transform duration-300">
                      Join community
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </span>
                    <span className="font-mono text-[10px] text-[#F3EFE4]/20">{c.members} members</span>
                  </div>
                </div>
              </a>
            </motion.div>
          ))}
        </div>

        {/* Mobile "All communities" link */}
        <div className="mt-6 text-center sm:hidden">
          <a
            href="/communities"
            className="font-mono text-sm text-[#FD5000] transition-colors hover:text-[#ff7a2e]"
          >
            All communities →
          </a>
        </div>
      </div>
    </section>
  );
}