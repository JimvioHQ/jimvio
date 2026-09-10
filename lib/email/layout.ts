import { getAppBaseUrl } from "@/lib/email/config";

/** Jimvio transactional email shell (Resend product mail). */
export function wrapEmailHtml(params: {
    preview: string;
    heading: string;
    bodyHtml: string;
    ctaLabel?: string;
    ctaUrl?: string;
}): string {
    const baseUrl = getAppBaseUrl();
    const logoUrl = `${baseUrl.replace(/\/$/, "")}/jimvio-logo-mark.png`;
    const ctaBlock =
        params.ctaLabel && params.ctaUrl
            ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
        <tr>
          <td align="center" bgcolor="#FF5A1F" style="border-radius:10px;">
            <a href="${params.ctaUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
              ${params.ctaLabel}
            </a>
          </td>
        </tr>
      </table>`
            : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${params.heading}</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${params.preview}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:22px 28px 18px;border-bottom:1px solid #E5E7EB;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${logoUrl}" width="36" height="36" alt="Jimvio" style="display:block;border:0;width:36px;height:36px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:18px;font-weight:800;letter-spacing:-0.02em;color:#111827;">Jimvio</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:#111827;">${params.heading}</h1>
              <div style="font-size:15px;line-height:1.65;color:#6B7280;">${params.bodyHtml}</div>
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#FAFAFA;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9CA3AF;">
                You received this email because of activity on your Jimvio account.
                <a href="${baseUrl}/identity/settings" style="color:#6B7280;">Manage preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
