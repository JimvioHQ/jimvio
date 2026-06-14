import { getAppBaseUrl } from "@/lib/email/config";

export function wrapEmailHtml(params: {
    preview: string;
    heading: string;
    bodyHtml: string;
    ctaLabel?: string;
    ctaUrl?: string;
}): string {
    const baseUrl = getAppBaseUrl();
    const ctaBlock =
        params.ctaLabel && params.ctaUrl
            ? `<p style="margin:28px 0 0;">
        <a href="${params.ctaUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;">
          ${params.ctaLabel}
        </a>
      </p>`
            : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${params.heading}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${params.preview}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px 8px;border-bottom:1px solid #f4f4f5;">
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#f97316;">Jimvio</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f172a;">${params.heading}</h1>
              <div style="font-size:15px;line-height:1.6;color:#52525b;">${params.bodyHtml}</div>
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#fafafa;border-top:1px solid #f4f4f5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                You received this email because of activity on your Jimvio account.
                <a href="${baseUrl}/dashboard/settings" style="color:#71717a;">Manage preferences</a>
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
