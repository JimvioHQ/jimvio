import type { Metadata } from "next";
import Link from "next/link";
import { InfoSection, PublicInfoPage } from "@/components/layout/public-info-page";
import { API_V1_DOCS } from "@/lib/navigation/api-v1-docs";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("docs");

export default function ApiDocsPage() {
  return (
    <PublicInfoPage
      eyebrow="Resources"
      title="API Docs"
      lede="Merchant API routes under /api/v1. Each call is authorized with a merchant API key. This page does not show secrets, and it does not create keys."
    >
      <InfoSection title="Authentication">
        <p>
          Send <code className="text-[13px]">Authorization: Bearer</code> followed by the merchant
          API key. Keys use the <code className="text-[13px]">jmv_</code> prefix and are shown once
          when they are issued. Do not put a key in client-side code or in a public page.
        </p>
        <p>
          The old channel API key screen is retired, so this page cannot issue a key. For access
          on an authorized merchant account,{" "}
          <Link href="/help/contact" className="font-medium text-[var(--color-accent)] hover:underline">
            contact support
          </Link>
          . Use of the API is also covered by the{" "}
          <Link href="/legal/developer" className="font-medium text-[var(--color-accent)] hover:underline">
            Developer Terms
          </Link>
          .
        </p>
      </InfoSection>

      <InfoSection title="Endpoints">
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Path</th>
                <th className="px-4 py-3 font-semibold">Scope</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {API_V1_DOCS.map((endpoint) => (
                <tr key={`${endpoint.method}-${endpoint.path}`} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-text-primary">{endpoint.method}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-text-primary">{endpoint.path}</td>
                  <td className="px-4 py-3 font-mono text-[12px]">{endpoint.scope}</td>
                  <td className="px-4 py-3">
                    {endpoint.summary}
                    {endpoint.idempotencyKey ? " Requires an Idempotency-Key header." : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InfoSection>
    </PublicInfoPage>
  );
}
