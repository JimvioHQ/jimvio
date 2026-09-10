/**
 * Shared Jimvio auth/security email HTML primitives.
 * Compatible with Supabase GoTrue templates ({{ .ConfirmationURL }}, {{ .Token }}, etc.).
 * Email-client safe: tables, inline CSS, system fonts only.
 */

const BRAND = {
  orange: "#FF5A1F",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  logoUrl: "https://www.jimvio.com/jimvio-logo-mark.png",
  siteUrl: "https://www.jimvio.com",
  supportUrl: "https://www.jimvio.com/contact",
  helpUrl: "https://www.jimvio.com/help",
} as const;

export function authEmailShell(params: {
  preview: string;
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  /** Use Supabase template variable, e.g. {{ .ConfirmationURL }} */
  ctaUrl?: string;
  securityNote?: string;
  fallbackUrl?: string;
}): string {
  const cta =
    params.ctaLabel && params.ctaUrl
      ? `
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
        <tr>
          <td align="center" bgcolor="${BRAND.orange}" style="border-radius:10px;">
            <a href="${params.ctaUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:${BRAND.white};text-decoration:none;border-radius:10px;">
              ${params.ctaLabel}
            </a>
          </td>
        </tr>
      </table>`
      : "";

  const fallback =
    params.fallbackUrl
      ? `<p style="margin:20px 0 0;font-size:12px;line-height:1.55;color:${BRAND.muted};">
          If the button does not work, copy and paste this link into your browser:<br />
          <a href="${params.fallbackUrl}" style="color:${BRAND.orange};word-break:break-all;">${params.fallbackUrl}</a>
        </p>`
      : "";

  const security =
    params.securityNote ??
    "If you did not request this, you can safely ignore this email. Your account remains secure.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${params.heading}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${params.preview}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:22px 28px 18px;border-bottom:1px solid ${BRAND.border};">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${BRAND.logoUrl}" width="36" height="36" alt="Jimvio" style="display:block;border:0;width:36px;height:36px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:18px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.text};">Jimvio</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${BRAND.text};">${params.heading}</h1>
              <div style="font-size:15px;line-height:1.65;color:${BRAND.muted};">${params.bodyHtml}</div>
              ${cta}
              ${fallback}
              <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid ${BRAND.border};font-size:12px;line-height:1.55;color:${BRAND.muted};">
                ${security}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 22px;background:#FAFAFA;border-top:1px solid ${BRAND.border};">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:${BRAND.muted};">
                Need help? <a href="${BRAND.helpUrl}" style="color:${BRAND.orange};text-decoration:none;font-weight:600;">Help Center</a>
                · <a href="${BRAND.supportUrl}" style="color:${BRAND.orange};text-decoration:none;font-weight:600;">Contact</a>
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#9CA3AF;">
                © Jimvio · <a href="${BRAND.siteUrl}" style="color:#9CA3AF;text-decoration:none;">jimvio.com</a>
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
