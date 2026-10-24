"use client";

import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";

export type DigitalSourceValue = {
  acquisition_model: string;
  rightsholder_name: string;
  content_language: string;
  intended_audience: string;
  buyer_license_summary: string;
  refund_policy_note: string;
  compatibility_notes: string;
  update_policy: string;
  affiliate_destination_url: string;
  declarations_accepted: boolean;
  evidence_url: string;
  evidence_file_name: string;
};

const SOURCES = [
  { id: "original_vendor_product", label: "Original vendor product", hint: "You created it and authorize Jimvio to sell it." },
  { id: "licensed_resale_product", label: "Licensed resale", hint: "You can prove Jimvio may resell the file." },
  { id: "distribution_partner_product", label: "Distribution partner", hint: "A publisher authorized distribution." },
  { id: "affiliate_only_product", label: "Affiliate only", hint: "Promote an external offer. Jimvio will not host the file." },
];

export function DigitalSourceFields({
  value,
  onChange,
}: {
  value: DigitalSourceValue;
  onChange: (patch: Partial<DigitalSourceValue>) => void;
}) {
  const affiliate = value.acquisition_model === "affiliate_only_product";
  return (
    <div className="space-y-3" aria-labelledby="digital-source-heading">
      <div>
        <p id="digital-source-heading" className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          Source and rights
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
          A license file is evidence. It does not by itself approve the product. Resale labels such as PLR are not proof.
        </p>
      </div>
      <div className="grid gap-2">
        {SOURCES.map((source) => (
          <label key={source.id} className="flex cursor-pointer gap-2 rounded-md border p-3" style={{ borderColor: value.acquisition_model === source.id ? "var(--color-accent)" : "var(--color-border)" }}>
            <input
              type="radio"
              name="acquisition_model"
              value={source.id}
              checked={value.acquisition_model === source.id}
              onChange={() => onChange({ acquisition_model: source.id })}
            />
            <span>
              <span className="block text-sm" style={{ color: "var(--color-text-primary)" }}>{source.label}</span>
              <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>{source.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <label className="block text-xs" style={{ color: "var(--color-text-muted)" }}>
        Creator or rightsholder
        <input className="mt-1 h-10 w-full rounded-md border px-3 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }} value={value.rightsholder_name} onChange={(e) => onChange({ rightsholder_name: e.target.value })} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs" style={{ color: "var(--color-text-muted)" }}>
          Language
          <input className="mt-1 h-10 w-full rounded-md border px-3 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }} value={value.content_language} onChange={(e) => onChange({ content_language: e.target.value })} placeholder="English" />
        </label>
        <label className="block text-xs" style={{ color: "var(--color-text-muted)" }}>
          Intended audience
          <input className="mt-1 h-10 w-full rounded-md border px-3 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }} value={value.intended_audience} onChange={(e) => onChange({ intended_audience: e.target.value })} />
        </label>
      </div>
      <label className="block text-xs" style={{ color: "var(--color-text-muted)" }}>
        What the buyer is allowed to do
        <textarea className="mt-1 min-h-20 w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }} value={value.buyer_license_summary} onChange={(e) => onChange({ buyer_license_summary: e.target.value })} />
      </label>
      <label className="block text-xs" style={{ color: "var(--color-text-muted)" }}>
        Refund note shown before purchase
        <textarea className="mt-1 min-h-16 w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }} value={value.refund_policy_note} onChange={(e) => onChange({ refund_policy_note: e.target.value })} />
      </label>
      <label className="block text-xs" style={{ color: "var(--color-text-muted)" }}>
        Compatibility
        <input className="mt-1 h-10 w-full rounded-md border px-3 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }} value={value.compatibility_notes} onChange={(e) => onChange({ compatibility_notes: e.target.value })} />
      </label>
      <label className="block text-xs" style={{ color: "var(--color-text-muted)" }}>
        Update policy
        <input className="mt-1 h-10 w-full rounded-md border px-3 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }} value={value.update_policy} onChange={(e) => onChange({ update_policy: e.target.value })} />
      </label>
      {affiliate && (
        <label className="block text-xs" style={{ color: "var(--color-text-muted)" }}>
          Affiliate destination (https)
          <input className="mt-1 h-10 w-full rounded-md border px-3 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }} value={value.affiliate_destination_url} onChange={(e) => onChange({ affiliate_destination_url: e.target.value })} placeholder="https://" />
        </label>
      )}
      <div>
        <p className="mb-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
          {affiliate ? "Affiliate program authorization" : "License or ownership evidence"} (private)
        </p>
        {value.evidence_url ? (
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Evidence stored privately: {value.evidence_file_name || "document"}</p>
        ) : (
          <CloudinaryUploadButton
            folder="jimvio/documents"
            resourceType="raw"
            accessType="private"
            buttonText="Upload evidence"
            onUploadSuccess={(url, _id, meta) => onChange({ evidence_url: url, evidence_file_name: meta?.originalFilename || "evidence" })}
          />
        )}
      </div>
      <label className="flex items-start gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        <input type="checkbox" checked={value.declarations_accepted} onChange={(e) => onChange({ declarations_accepted: e.target.checked })} />
        <span>I declare that the information is accurate, that I have authority to submit this product, and that Jimvio may review the evidence before anything is published.</span>
      </label>
    </div>
  );
}
