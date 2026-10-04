"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, Mail } from "lucide-react";
import type { LegalSection } from "@/lib/legal/catalog";
import { LEGAL_CONTACT } from "@/lib/legal/catalog";
import { cn } from "@/lib/utils";
import { LegalDocumentActions } from "./LegalDocumentActions";

type Props = {
  sections: LegalSection[];
  title: string;
  className?: string;
  collapsible?: boolean;
};

export function LegalToc({ sections, title, className, collapsible = false }: Props) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const [open, setOpen] = useState(!collapsible);

  useEffect(() => {
    if (!sections.length) return;

    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.1, 0.35, 0.6],
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  }

  return (
    <aside className={cn("flex flex-col gap-4", className)} aria-label="On this page">
      <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-4 dark:bg-[var(--color-surface)]">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
            aria-expanded={open}
          >
            <span className="text-sm font-bold text-[var(--color-text-primary)]">On this page</span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        ) : (
          <p className="mb-3 text-sm font-bold text-[var(--color-text-primary)]">On this page</p>
        )}

        {open ? (
          <nav className={cn(collapsible && "mt-3")}>
            <ol className="flex flex-col gap-1">
              {sections.map((section) => {
                const active = section.id === activeId;
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left text-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]",
                        active
                          ? "font-semibold text-[#C2410C]"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full border",
                          active
                            ? "border-[#FF5A1F] bg-[#FF5A1F]"
                            : "border-[var(--color-border-strong)] bg-transparent",
                        )}
                        aria-hidden="true"
                      />
                      {section.title}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}
      </div>

      <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-4 dark:bg-[var(--color-surface)]">
        <div className="mb-2 flex items-center gap-2">
          <Download className="h-4 w-4 text-[#FF5A1F]" aria-hidden="true" />
          <p className="text-sm font-bold text-[var(--color-text-primary)]">Need a printable copy?</p>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          Print this page or save it as a PDF from your browser.
        </p>
        <LegalDocumentActions title={title} compact />
      </div>

      <div className="rounded-[16px] border border-[rgba(255,90,31,0.18)] bg-[rgba(255,90,31,0.05)] p-4">
        <div className="mb-2 flex items-center gap-2">
          <Mail className="h-4 w-4 text-[#FF5A1F]" aria-hidden="true" />
          <p className="text-sm font-bold text-[var(--color-text-primary)]">Have questions?</p>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          Reach Jimvio legal and support through our contact page.
        </p>
        <Link
          href={LEGAL_CONTACT.contactPath}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[rgba(255,90,31,0.3)] bg-white text-sm font-bold text-[#C2410C] transition hover:bg-[rgba(255,90,31,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] dark:bg-[var(--color-surface)]"
        >
          Contact Legal
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </aside>
  );
}
