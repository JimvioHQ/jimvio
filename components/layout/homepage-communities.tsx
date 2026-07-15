"use client";

import { useState } from "react";
import { ArrowRight, Users, MessageCircle, Zap, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { SectionHeading } from "../ui";

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
    <section className="relative bg-[var(--color-surface)] py-16 sm:py-24 overflow-hidden border-t border-[var(--color-border)]">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(253,80,0,0.04)_0%,transparent_60%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--color-accent)_15%,transparent)] to-transparent" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-[color-mix(in_srgb,var(--color-accent)_3%,transparent)] rounded-full blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-12 sm:mb-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--color-accent)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                </span>
                Communities
              </span>
              <h2 className="mt-4 text-[clamp(1.75rem,4.5vw,3rem)] font-bold leading-[1.08] tracking-tight text-[var(--color-text-primary)]">
                Where <span className="text-[var(--color-accent)]">builders</span>,{" "}
                <span className="text-[var(--color-accent)]">creators</span>{" "}
                <span className="text-[var(--color-text-muted)]">&</span>{" "}
                <span className="text-[var(--color-accent)]">sellers</span>{" "}
                grow together
              </h2>
              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                Join 17K+ members across 6 focused communities. Ask questions, share wins, find partners.
              </p>
            </div>

            <a
              href="/communities"
              className="hidden sm:inline-flex font-mono text-sm text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
            >
              All communities →
            </a>
          </div>
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
                  "group relative flex h-full flex-col rounded-2xl overflow-hidden border bg-[var(--color-bg-elevated)] transition-all duration-300 hover:-translate-y-1.5",
                  i === 0
                    ? "border-[color-mix(in_srgb,var(--color-accent)_25%,transparent)] hover:border-[color-mix(in_srgb,var(--color-accent)_50%,transparent)] hover:shadow-[0_0_40px_rgba(253,80,0,0.08)]"
                    : "border-[var(--color-border)] hover:border-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] hover:shadow-lg"
                )}
                aria-label={`Join ${c.name} community`}
              >
                {/* Top row: name/category + member count */}
                <div className="flex items-start justify-between p-6 pb-4">
                  <div>
                    <h3 className="font-display text-[22px] sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)] transition-colors duration-300 group-hover:text-[var(--color-accent)]">
                      {c.name}
                    </h3>
                    <div className="mt-2.5">
                      <span className="font-mono text-[9px] tracking-[0.12em] uppercase px-2.5 py-1 rounded-md bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] text-[var(--color-accent)] border border-[color-mix(in_srgb,var(--color-accent)_15%,transparent)]">
                        {c.category}
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-full text-[10px] font-mono font-medium bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                    <Users size={11} /> {c.members}
                  </span>
                </div>

                {/* Description */}
                <p className="px-6 text-[13px] leading-[1.7] text-[var(--color-text-muted)] flex-1">
                  {c.description}
                </p>

                {/* Bottom: tags + CTA */}
                <div className="px-6 pb-6 pt-5">
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {c.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[9px] tracking-wide px-2.5 py-1 rounded-md bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-accent)] transition-all duration-300 group-hover:gap-2.5">
                      Join community
                      <ArrowRight size={14} strokeWidth={2.5} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                    <span className="font-mono text-[9px] text-[var(--color-text-muted)]">{c.members} members</span>
                  </div>
                </div>
              </a>
            </motion.div>
          ))}
        </div>

        {/* Mobile "All communities" link */}
        <div className="mt-8 text-center sm:hidden">
          <a
            href="/communities"
            className="font-mono text-sm text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
          >
            All communities →
          </a>
        </div>
      </div>
    </section>
  );
}