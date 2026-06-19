"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { JIMVIO_ORANGE } from "@/lib/ai/chat-shared";

interface AiMessageMarkdownProps {
  content: string;
  className?: string;
  onNavigate?: (href: string) => void;
}

export function AiMessageMarkdown({ content, className, onNavigate }: AiMessageMarkdownProps) {
  return (
    <div className={cn("jimvio-ai-md space-y-2 text-[14px] leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        h1: ({ children }) => (
          <p className="text-[15px] font-bold text-[var(--color-text-primary)]">{children}</p>
        ),
        h2: ({ children }) => (
          <p className="text-[14px] font-bold text-[var(--color-text-primary)]">{children}</p>
        ),
        h3: ({ children }) => (
          <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">{children}</p>
        ),
        p: ({ children }) => (
          <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-[var(--color-text-primary)]">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="ml-4 list-disc space-y-1 text-[var(--color-text-secondary)]">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="ml-4 list-decimal space-y-1 text-[var(--color-text-secondary)]">{children}</ol>
        ),
        li: ({ children }) => <li className="pl-0.5">{children}</li>,
        a: ({ href, children }) => {
          const path = href ?? "/";
          const isInternal = path.startsWith("/");
          const className =
            "inline-flex items-center gap-1 rounded-md border border-[#FFE0D1] bg-[#FFFDFB] px-2 py-0.5 text-[12px] font-semibold transition-colors hover:bg-[#FF5A1F]/10";
          if (isInternal && onNavigate) {
            return (
              <button
                type="button"
                onClick={() => onNavigate(path)}
                className={className}
                style={{ color: JIMVIO_ORANGE }}
              >
                {children}
              </button>
            );
          }
          return (
            <a
              href={path}
              target={isInternal ? undefined : "_blank"}
              rel={isInternal ? undefined : "noopener noreferrer"}
              className={className}
              style={{ color: JIMVIO_ORANGE }}
            >
              {children}
            </a>
          );
        },
        code: ({ className: codeClass, children }) => {
          const isBlock = codeClass?.includes("language-");
          if (isBlock) {
            return (
              <pre className="overflow-x-auto rounded-lg border border-[#FFE0D1] bg-[#FFFDFB] p-3 text-[12px]">
                <code>{children}</code>
              </pre>
            );
          }
          return (
            <code className="rounded bg-[#FF5A1F]/8 px-1 py-0.5 text-[12px] font-medium text-[var(--color-text-primary)]">
              {children}
            </code>
          );
        },
        table: ({ children }) => (
          <div className="overflow-x-auto rounded-lg border border-[#FFE0D1]">
            <table className="w-full min-w-[280px] text-left text-[12px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-[#FF5A1F]/5 text-[var(--color-text-primary)]">{children}</thead>
        ),
        th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
        td: ({ children }) => (
          <td className="border-t border-[#FFE0D1]/60 px-3 py-2 text-[var(--color-text-secondary)]">
            {children}
          </td>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[#FF5A1F]/40 pl-3 text-[var(--color-text-muted)]">
            {children}
          </blockquote>
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
