import {
  EMAIL_COLORS as C,
  EMAIL_SOCIAL,
  emailIconUrl,
  type EmailIconName,
} from "./brand";
import { escapeAttr, escapeHtml } from "./escape";

export type EmailStat = {
  icon: EmailIconName;
  label: string;
  value: string;
};

export type EmailLine = {
  name: string;
  detail?: string | null;
  quantity: number;
  imageUrl?: string | null;
};

export type JimvioEmailContent = {
  preview: string;
  icon: EmailIconName;
  titleLead: string;
  titleAccent?: string;
  subtitle?: string;
  /** Pre-escaped HTML for uncommon bodies such as support replies. */
  bodyHtml?: string;
  details?: {
    label: string;
    headline?: string;
    paragraph?: string;
    stats?: EmailStat[];
  };
  items?: {
    label: string;
    rows: EmailLine[];
  };
  code?: {
    label: string;
    digits?: string[];
    /** Emit Supabase {{ .Token }} digit cells. Never invent a code. */
    supabaseOtp?: boolean;
  };
  notice?: {
    icon: EmailIconName;
    title: string;
    body: string;
  };
  cta?: {
    label: string;
    url: string;
    /** Supabase action URLs such as {{ .ConfirmationURL }}. */
    trusted?: boolean;
  };
  footnote?: string;
  help: string;
  helpUrl: string;
  assetBaseUrl: string;
};

function safeHttpUrl(url: string, trusted = false): string | null {
  const value = url.trim();
  if (!value || /[\r\n<>]/.test(value)) return null;
  if (trusted && value.startsWith("{{") && value.endsWith("}}")) return value;
  if (/^https:\/\//i.test(value)) return value;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?\//i.test(value)) return value;
  return null;
}

function img(base: string, name: EmailIconName, size: number, alt: string): string {
  const src = escapeAttr(emailIconUrl(base, name));
  return `<img src="${src}" width="${size}" height="${size}" alt="${escapeAttr(alt)}" style="display:block;border:0;outline:none;text-decoration:none;width:${size}px;height:${size}px;" />`;
}

function supabaseOtpRow(): string {
  const cell = (start: number) =>
    `<td align="center" valign="middle" width="52" height="64" bgcolor="#ffffff" style="width:52px;height:64px;background:#ffffff;border:1px solid ${C.line};border-radius:16px;font-size:28px;line-height:64px;font-weight:800;color:${C.navy};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">{{ slice .Token ${start} ${start + 1} }}</td>`;
  const gap = `<td width="8" style="width:8px;font-size:0;line-height:0;">&nbsp;</td>`;
  const cells = [0, 1, 2, 3, 4, 5].map((n) => cell(n)).join(gap);
  return `{{ if ge (len .Token) 6 }}
<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:8px auto 0;"><tr>${cells}</tr></table>
{{ else }}
<p style="margin:12px 0 0;font-size:28px;line-height:1.2;font-weight:800;letter-spacing:0.18em;color:${C.navy};">{{ .Token }}</p>
{{ end }}`;
}

function digitRow(digits: string[]): string {
  const cells = digits
    .slice(0, 8)
    .map(
      (digit, index) =>
        `${index ? `<td width="8" style="width:8px;font-size:0;line-height:0;">&nbsp;</td>` : ""}<td align="center" valign="middle" width="52" height="64" bgcolor="#ffffff" style="width:52px;height:64px;background:#ffffff;border:1px solid ${C.line};border-radius:16px;font-size:28px;line-height:64px;font-weight:800;color:${C.navy};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(digit)}</td>`,
    )
    .join("");
  return `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:8px auto 0;"><tr>${cells}</tr></table>`;
}

export function renderJimvioEmail(input: JimvioEmailContent): { html: string; text: string } {
  const base = input.assetBaseUrl.replace(/\/$/, "");
  const title = `${escapeHtml(input.titleLead)}${
    input.titleAccent
      ? `<span style="color:${C.orange};">${escapeHtml(input.titleAccent)}</span>`
      : ""
  }`;
  const plainTitle = `${input.titleLead}${input.titleAccent ?? ""}`.trim();

  const subtitle = input.subtitle?.trim()
    ? `<p style="margin:12px auto 0;max-width:440px;font-size:15px;line-height:1.6;color:${C.muted};">${escapeHtml(input.subtitle.trim()).replace(/\n/g, "<br />")}</p>`
    : "";

  const body = input.bodyHtml?.trim()
    ? `<div style="margin:18px 0 0;font-size:15px;line-height:1.65;color:${C.muted};text-align:left;">${input.bodyHtml}</div>`
    : "";

  const stats = input.details?.stats?.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;"><tr>${input.details.stats
        .map(
          (stat) => `<td class="stat" valign="top" width="25%" style="width:25%;padding:4px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${C.line};border-radius:14px;">
              <tr><td align="center" style="padding:12px 6px 10px;">
                <table role="presentation" cellspacing="0" cellpadding="0" align="center"><tr>
                  <td align="center" valign="middle" width="36" height="36" bgcolor="${C.iconPeach}" style="width:36px;height:36px;background:${C.iconPeach};border-radius:18px;">${img(base, stat.icon, 18, "")}</td>
                </tr></table>
                <p style="margin:8px 0 0;font-size:11px;line-height:1.3;color:${C.faint};">${escapeHtml(stat.label)}</p>
                <p style="margin:2px 0 0;font-size:13px;line-height:1.3;font-weight:700;color:${C.navy};">${escapeHtml(stat.value)}</p>
              </td></tr>
            </table>
          </td>`,
        )
        .join("")}</tr></table>`
    : "";

  const details = input.details
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border:1px solid ${C.line};border-radius:18px;">
        <tr><td style="padding:18px 14px 14px;" align="center">
          <p style="margin:0;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:0.14em;color:${C.faint};">${escapeHtml(input.details.label)}</p>
          ${
            input.details.headline
              ? `<p style="margin:8px 0 0;font-size:22px;line-height:1.2;font-weight:800;letter-spacing:-0.03em;color:${C.navy};">${escapeHtml(input.details.headline)}</p>`
              : ""
          }
          ${
            input.details.paragraph
              ? `<p style="margin:10px auto 0;max-width:460px;font-size:14px;line-height:1.6;color:${C.muted};">${escapeHtml(input.details.paragraph)}</p>`
              : ""
          }
          ${stats}
        </td></tr>
      </table>`
    : "";

  const itemRows = input.items?.rows.length
    ? input.items.rows
        .map((row, index) => {
          const image = safeHttpUrl(row.imageUrl ?? "");
          const thumb = image
            ? `<img src="${escapeAttr(image)}" width="40" height="40" alt="" style="display:block;border:0;width:40px;height:40px;border-radius:12px;object-fit:cover;" />`
            : img(base, "bag", 20, "");
          const border = index < input.items!.rows.length - 1 ? `border-bottom:1px solid ${C.line};` : "";
          const detail = row.detail?.trim()
            ? `<p style="margin:2px 0 0;font-size:12px;line-height:1.4;color:${C.faint};">${escapeHtml(row.detail.trim())}</p>`
            : "";
          return `<tr>
            <td width="52" valign="middle" style="padding:12px 0;${border}">
              <table role="presentation" cellspacing="0" cellpadding="0"><tr>
                <td align="center" valign="middle" width="40" height="40" bgcolor="${C.iconPeach}" style="width:40px;height:40px;background:${C.iconPeach};border-radius:12px;">${thumb}</td>
              </tr></table>
            </td>
            <td valign="middle" style="padding:12px 8px;${border}">
              <p style="margin:0;font-size:14px;line-height:1.35;font-weight:700;color:${C.navy};">${escapeHtml(row.name)}</p>
              ${detail}
            </td>
            <td valign="middle" align="right" style="padding:12px 0;${border}font-size:13px;font-weight:600;color:${C.muted};white-space:nowrap;">Qty: ${escapeHtml(String(row.quantity))}</td>
          </tr>`;
        })
        .join("")
    : "";

  const items = itemRows
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;border:1px solid ${C.line};border-radius:18px;">
        <tr><td style="padding:8px 16px 4px;">
          <p style="margin:10px 0 0;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:0.12em;color:${C.faint};">${escapeHtml(input.items!.label)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${itemRows}</table>
        </td></tr>
      </table>`
    : "";

  const code = input.code
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border:1px solid ${C.line};border-radius:18px;">
        <tr><td align="center" style="padding:18px 12px 20px;">
          <p style="margin:0;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:0.14em;color:${C.faint};">${escapeHtml(input.code.label)}</p>
          ${input.code.supabaseOtp ? supabaseOtpRow() : input.code.digits?.length ? digitRow(input.code.digits) : ""}
        </td></tr>
      </table>`
    : "";

  const notice = input.notice
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;background:${C.peach};border-radius:18px;">
        <tr><td style="padding:16px 16px 16px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
            <td width="42" valign="top">
              <table role="presentation" cellspacing="0" cellpadding="0"><tr>
                <td align="center" valign="middle" width="36" height="36" bgcolor="#ffffff" style="width:36px;height:36px;background:#ffffff;border-radius:18px;">${img(base, input.notice.icon, 18, "")}</td>
              </tr></table>
            </td>
            <td valign="top" style="padding-left:8px;">
              <p style="margin:0;font-size:15px;line-height:1.35;font-weight:800;color:${C.navy};">${escapeHtml(input.notice.title)}</p>
              <p style="margin:4px 0 0;font-size:13px;line-height:1.55;color:${C.muted};">${escapeHtml(input.notice.body).replace(/\n/g, "<br />")}</p>
            </td>
          </tr></table>
        </td></tr>
      </table>`
    : "";

  const ctaUrl = input.cta ? safeHttpUrl(input.cta.url, input.cta.trusted) : null;
  const cta =
    input.cta && ctaUrl
      ? `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:22px auto 0;">
          <tr><td align="center" bgcolor="${C.orange}" style="border-radius:999px;background:${C.orange};">
            <a href="${escapeAttr(ctaUrl)}" target="_blank" style="display:inline-block;padding:14px 34px;font-size:15px;line-height:1.2;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(input.cta.label)} &rarr;</a>
          </td></tr>
        </table>`
      : "";

  const footnote = input.footnote?.trim()
    ? `<p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:${C.faint};text-align:center;">${escapeHtml(input.footnote.trim())}</p>`
    : "";

  const helpUrl = safeHttpUrl(input.helpUrl) ?? `${base}/contact`;
  const year = new Date().getFullYear();
  const social = EMAIL_SOCIAL.map(
    (item) =>
      `<td style="padding:0 8px;"><a href="${escapeAttr(item.href)}" target="_blank" style="text-decoration:none;">${img(base, item.name, 18, item.label)}</a></td>`,
  ).join("");

  const footerLinks = [
    ["About Us", `${base}/about`],
    ["Contact Support", `${base}/contact`],
    ["Terms", `${base}/terms`],
    ["Privacy", `${base}/privacy`],
  ]
    .map(
      ([label, href], index) =>
        `${index ? `<span style="color:${C.line};">&nbsp;&nbsp;|&nbsp;&nbsp;</span>` : ""}<a href="${escapeAttr(href)}" style="color:${C.muted};text-decoration:none;">${label}</a>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(plainTitle)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    @media only screen and (max-width: 520px) {
      .card { width: 100% !important; }
      .stat { display: inline-block !important; width: 48% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.canvas};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(input.preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.canvas};">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" class="card" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px;background:${C.white};border-radius:28px;border:1px solid #EEF2F6;">
        <tr><td align="center" style="padding:36px 28px 8px;">
          <table role="presentation" cellspacing="0" cellpadding="0" align="center">
            <tr>
              <td width="36" valign="middle" align="center" style="color:${C.orange};font-size:14px;line-height:1;">&#10022;</td>
              <td align="center" valign="middle" style="padding:0 8px;">
                <table role="presentation" cellspacing="0" cellpadding="0" align="center"><tr>
                  <td width="22" height="22" bgcolor="#FFE8D8" style="width:22px;height:22px;background:#FFE8D8;border-radius:11px;font-size:0;line-height:0;">&nbsp;</td>
                </tr></table>
              </td>
              <td align="center" valign="middle" width="86" height="86" bgcolor="#ffffff" style="width:86px;height:86px;background:#ffffff;border:1px solid #FFE4D6;border-radius:24px;">${img(base, input.icon, 40, "")}</td>
              <td align="center" valign="middle" style="padding:0 8px;">
                <table role="presentation" cellspacing="0" cellpadding="0" align="center"><tr>
                  <td width="28" height="28" bgcolor="#FFF1E8" style="width:28px;height:28px;background:#FFF1E8;border-radius:14px;font-size:0;line-height:0;">&nbsp;</td>
                </tr></table>
              </td>
              <td width="36" valign="middle" align="center" style="color:${C.orange};font-size:12px;line-height:1;">&#10022;</td>
            </tr>
          </table>
          <h1 style="margin:22px 0 0;font-size:32px;line-height:1.15;font-weight:800;letter-spacing:-0.035em;color:${C.navy};">${title}</h1>
          ${subtitle}
          ${body}
          ${details}
          ${items}
          ${code}
          ${notice}
          ${cta}
          ${footnote}
        </td></tr>
        <tr><td style="padding:8px 28px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid ${C.line};margin-top:18px;">
            <tr><td style="padding:16px 0;">
              <a href="${escapeAttr(helpUrl)}" target="_blank" style="text-decoration:none;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
                  <td width="46" valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0"><tr>
                      <td align="center" valign="middle" width="40" height="40" bgcolor="#F8FAFC" style="width:40px;height:40px;background:#F8FAFC;border-radius:14px;">${img(base, "chat", 18, "")}</td>
                    </tr></table>
                  </td>
                  <td valign="middle" style="padding:0 8px;">
                    <p style="margin:0;font-size:14px;line-height:1.3;font-weight:800;color:${C.navy};">Need Help?</p>
                    <p style="margin:3px 0 0;font-size:13px;line-height:1.45;color:${C.muted};">${escapeHtml(input.help)}</p>
                  </td>
                  <td width="24" valign="middle" align="right">${img(base, "chevron", 16, "")}</td>
                </tr></table>
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:8px 28px 28px;">
          <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 14px;"><tr>${social}</tr></table>
          <p style="margin:0;font-size:13px;line-height:1.6;color:${C.muted};">${footerLinks}</p>
          <p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:${C.muted};">Visit Jimvio: <a href="https://www.jimvio.com" style="color:${C.link};text-decoration:underline;">https://www.jimvio.com</a></p>
          <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:${C.faint};">&copy; ${year} Jimvio. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    plainTitle,
    input.subtitle?.trim() ?? "",
    input.details?.label ?? "",
    input.details?.headline ?? "",
    input.details?.paragraph ?? "",
    ...(input.details?.stats ?? []).map((stat) => `${stat.label}: ${stat.value}`),
    ...(input.items?.rows ?? []).map((row) => `${row.name}${row.detail ? ` (${row.detail})` : ""} · Qty ${row.quantity}`),
    input.code?.supabaseOtp ? `${input.code.label}: use the code in this email` : "",
    input.code?.digits?.length ? `${input.code.label}: ${input.code.digits.join(" ")}` : "",
    input.notice ? `${input.notice.title} ${input.notice.body}` : "",
    ctaUrl && input.cta ? `${input.cta.label}: ${ctaUrl}` : "",
    input.footnote ?? "",
    input.help,
    helpUrl,
    "Visit Jimvio: https://www.jimvio.com",
    `© ${year} Jimvio. All rights reserved.`,
  ]
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  return { html, text };
}
