"use client";

import { useState, type FormEvent } from "react";
import { publicTrustView, sanitizePublicText } from "@/lib/digital-products/trust/public-view";
import type { FulfillmentMode, LicenseStatus, ScanStatus, VerificationState } from "@/lib/digital-products/trust/types";

type TrustSource = {
  id?: string;
  digital_verification_state?: string | null;
  fulfillment_mode?: string | null;
  buyer_license_summary?: string | null;
  refund_policy_note?: string | null;
  compatibility_notes?: string | null;
  update_policy?: string | null;
  content_language?: string | null;
  digital_file_size?: number | null;
  acquisition_model?: string | null;
  vendors?: { verification_status?: string | null } | null;
};

function formatBytes(size: number | null | undefined): string | null {
  if (!size || size <= 0) return null;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function DigitalTrustPanel({
  product,
  vendorStatus,
  licenseStatus = null,
  licenseExpired = false,
  licenseRevoked = false,
  scanStatus = null,
  scanBytesInspected = false,
  humanApproved = false,
}: {
  product: TrustSource;
  vendorStatus?: string | null;
  licenseStatus?: LicenseStatus | null;
  licenseExpired?: boolean;
  licenseRevoked?: boolean;
  scanStatus?: ScanStatus | null;
  scanBytesInspected?: boolean;
  humanApproved?: boolean;
}) {
  const affiliate = product.fulfillment_mode === "affiliate_redirect" || product.acquisition_model === "affiliate_only_product";
  const trust = publicTrustView({
    vendorVerificationStatus: vendorStatus ?? product.vendors?.verification_status ?? null,
    licenseStatus,
    licenseExpired: licenseExpired || licenseStatus === "expired",
    licenseRevoked: licenseRevoked || licenseStatus === "revoked",
    scanStatus,
    scanBytesInspected,
    verificationState: (product.digital_verification_state as VerificationState | null) ?? null,
    humanApproved,
    fulfillment: (product.fulfillment_mode as FulfillmentMode | null) ?? (affiliate ? "affiliate_redirect" : "download"),
    buyerLicenseSummary: product.buyer_license_summary ? sanitizePublicText(product.buyer_license_summary) : null,
    refundPolicyNote: product.refund_policy_note ? sanitizePublicText(product.refund_policy_note) : null,
  });
  const fileSize = formatBytes(product.digital_file_size);
  const rows = [
    ["Delivery", trust.deliveryLabel],
    ["Format", affiliate ? "External offer" : fileSize ? `Download · ${fileSize}` : "Download after payment"],
    ["Language", product.content_language ? sanitizePublicText(product.content_language) : "Not stated"],
    ["Compatibility", product.compatibility_notes ? sanitizePublicText(product.compatibility_notes) : "Not stated"],
    ["Updates", product.update_policy ? sanitizePublicText(product.update_policy) : "No update policy stated"],
  ];

  return (
    <section className="rounded-md" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }} aria-label="Product trust">
      <div className="border-b px-5 py-3.5" style={{ borderColor: "var(--color-border)" }}>
        <p className="text-[13px] font-bold" style={{ color: "var(--color-text-primary)" }}>What you can rely on</p>
      </div>
      <ul className="space-y-2 px-5 py-4">
        {trust.statements.map((line) => (
          <li key={line} className="text-[12px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{line}</li>
        ))}
      </ul>
      <div className="divide-y" style={{ borderTop: "1px solid var(--color-border)" }}>
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3 px-5 py-3">
            <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{label}</span>
            <span className="text-right text-[12px] font-medium" style={{ color: "var(--color-text-primary)" }}>{value}</span>
          </div>
        ))}
      </div>
      {trust.buyerLicenseSummary && (
        <p className="px-5 py-3 text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
          Buyer terms: {trust.buyerLicenseSummary}
        </p>
      )}
      <p className="px-5 py-3 text-[12px]" style={{ color: "var(--color-text-secondary)" }}>{trust.refundDisclosure}</p>
      <p className="px-5 pb-4 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
        These are separate checks. None of them means a file is guaranteed safe or legally certified.
      </p>
      {product.id && <DigitalIssueReport productId={product.id} />}
    </section>
  );
}

export function DigitalIssueReport({ productId, orderId }: { productId: string; orderId?: string }) {
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState("corrupted_file");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/digital-products/issues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, orderId, issueType, details }),
      });
      const body = await response.json();
      setMessage(body.error || (body.duplicate ? "This issue is already open." : "Issue submitted. It does not create a refund by itself."));
      if (response.ok) setDetails("");
    } catch {
      setMessage("The issue could not be submitted.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <div className="px-5 pb-4">
        <button type="button" className="text-[12px] font-semibold" style={{ color: "var(--color-accent)" }} onClick={() => setOpen(true)}>
          Report a problem with this product
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 px-5 pb-4">
      <label className="block text-[11px]" style={{ color: "var(--color-text-muted)" }}>
        Issue
        <select className="mt-1 h-9 w-full rounded-md border px-2 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }} value={issueType} onChange={(e) => setIssueType(e.target.value)}>
          <option value="corrupted_file">Corrupted or unreadable file</option>
          <option value="missing_content">Missing content</option>
          <option value="unauthorized_product">Unauthorized product</option>
          <option value="misleading_listing">Misleading listing</option>
          <option value="other">Something else</option>
        </select>
      </label>
      <label className="block text-[11px]" style={{ color: "var(--color-text-muted)" }}>
        Details
        <textarea required minLength={8} className="mt-1 min-h-20 w-full rounded-md border px-2 py-2 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }} value={details} onChange={(e) => setDetails(e.target.value)} />
      </label>
      <button type="submit" disabled={pending} className="rounded-md px-3 py-2 text-xs font-semibold text-white disabled:opacity-60" style={{ background: "var(--color-accent, #fd5000)" }}>
        {pending ? "Sending…" : "Submit report"}
      </button>
      {message && <p className="text-[12px]" role="status" style={{ color: "var(--color-text-secondary)" }}>{message}</p>}
    </form>
  );
}
