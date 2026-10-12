import { emailAssetBase } from "@/lib/email/brand";
import type { EmailIconName } from "@/lib/email/brand";
import { renderJimvioEmail } from "@/lib/email/shell";

/** Jimvio transactional email shell. */
export function wrapEmailHtml(params: {
  preview: string;
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  icon?: EmailIconName;
  help?: string;
}): string {
  const base = emailAssetBase();
  return renderJimvioEmail({
    preview: params.preview,
    icon: params.icon ?? "shield-check",
    titleLead: params.heading,
    subtitle: undefined,
    bodyHtml: params.bodyHtml,
    cta: params.ctaLabel && params.ctaUrl ? { label: params.ctaLabel, url: params.ctaUrl } : undefined,
    help: params.help ?? "If you have questions, our support team is here to help.",
    helpUrl: `${base}/contact`,
    assetBaseUrl: base,
  }).html;
}
