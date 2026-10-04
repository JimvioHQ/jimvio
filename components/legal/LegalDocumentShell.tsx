import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import {
  getLegalDocument,
  type LegalDocument,
  type LegalDocumentId,
} from "@/lib/legal/catalog";
import { LegalHeroBanner } from "./LegalHeroBanner";
import { LegalSidebarNav } from "./LegalSidebarNav";
import { LegalToc } from "./LegalToc";
import { LegalMobileNav } from "./LegalMobileNav";
import { LegalDocumentActions } from "./LegalDocumentActions";
import { LegalRelatedLinks, LegalReviewNotice, LegalTakeaways } from "./legal-ui";
import type { ReactNode } from "react";

type Props = {
  documentId: LegalDocumentId;
  children: ReactNode;
};

export function LegalDocumentShell({ documentId, children }: Props) {
  const document = getLegalDocument(documentId) as LegalDocument;
  const Icon = document.icon;
  const related = (document.related ?? [])
    .map((id) => getLegalDocument(id))
    .filter(Boolean)
    .map((doc) => ({ href: doc!.href, title: doc!.title }));

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[var(--color-bg)]">
      <div className="legal-no-print">
        <LegalHeroBanner document={document} mode="document" />
      </div>

      <div className="mx-auto max-w-8xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="legal-no-print mb-4 flex items-center justify-between gap-3 xl:hidden">
          <Link
            href="/legal"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Legal Center
          </Link>
          <LegalMobileNav activeId={document.id} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[270px_minmax(0,1fr)_250px] xl:items-start">
          <div className="legal-no-print sticky top-24 hidden max-h-[calc(100vh-7rem)] xl:block">
            <LegalSidebarNav activeId={document.id} className="max-h-[calc(100vh-7rem)]" />
          </div>

          <article className="legal-print-article rounded-[18px] border border-[var(--color-border)] bg-white p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] sm:p-7 lg:p-9 dark:bg-[var(--color-surface)]">
            <header className="mb-8 border-b border-[var(--color-border)] pb-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(255,90,31,0.12)] text-[#FF5A1F]">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C2410C]">
                      {document.title}
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)] sm:text-3xl">
                      {document.title}
                    </h2>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-text-muted)]">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        Last updated: {document.lastUpdated}
                      </span>
                      {document.version ? <span>• Version {document.version}</span> : null}
                    </p>
                  </div>
                </div>
                <div className="legal-no-print hidden lg:block">
                  <LegalDocumentActions title={document.title} />
                </div>
              </div>
              <div className="legal-no-print mt-4 lg:hidden">
                <LegalDocumentActions title={document.title} />
              </div>
            </header>

            {document.requiresReview ? <LegalReviewNotice title={document.title} /> : null}

            {document.takeaways?.length ? <LegalTakeaways items={document.takeaways} /> : null}

            <div className="legal-no-print mb-6 xl:hidden">
              <LegalToc sections={document.sections} title={document.title} collapsible />
            </div>

            <div className="legal-document-body">{children}</div>

            <LegalRelatedLinks links={related} />

            <p className="mt-10 border-t border-[var(--color-border)] pt-6 text-[13px] text-[var(--color-text-muted)]">
              Legal inquiries: info@jimvio.com · jimvio.com{document.href}
              {document.version ? ` · Version ${document.version}` : ""} · {document.lastUpdated}
            </p>
          </article>

          <div className="legal-no-print sticky top-24 hidden xl:block">
            <LegalToc sections={document.sections} title={document.title} />
          </div>
        </div>
      </div>
    </div>
  );
}
