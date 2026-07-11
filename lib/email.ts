/**
 * Email service for Jimvio.
 *
 * Uses Resend (https://resend.com) for transactional email delivery.
 * Falls back to logging in development when RESEND_API_KEY is not set.
 */

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

const DEFAULT_FROM = "Jimvio <noreply@jimvio.com>";

/**
 * Send a transactional email.
 * In development, logs to console instead of sending.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log("[email dev] Would send email:", {
      to: payload.to,
      subject: payload.subject,
      from: payload.from ?? DEFAULT_FROM,
    });
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: payload.from ?? DEFAULT_FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend error:", res.status, body);
    }
  } catch (err) {
    console.error("[email] Failed to send:", err);
  }
}

/* ── Email templates ── */

export function emailLayout(htmlContent: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;margin-top:24px;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:32px 24px 8px;text-align:center;">
        <h1 style="font-size:20px;font-weight:800;color:#111;margin:0;">Jimvio</h1>
      </td></tr>
      <tr><td style="padding:8px 24px 24px;">
        ${htmlContent}
      </td></tr>
      <tr><td style="padding:16px 24px;background:#fafafa;border-top:1px solid #eee;">
        <p style="margin:0;font-size:11px;color:#888;text-align:center;">
          Jimvio &mdash; Global Creator-Commerce Ecosystem<br/>
          <a href="https://www.jimvio.com" style="color:#fd5000;">www.jimvio.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
}

export function orderConfirmationEmail(params: {
  name: string;
  orderId: string;
  total: string;
  items: { name: string; qty: number; price: string }[];
}): string {
  const itemsHtml = params.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;font-size:13px;color:#333;">${i.name} &times; ${i.qty}</td><td style="padding:6px 0;font-size:13px;color:#333;text-align:right;">${i.price}</td></tr>`
    )
    .join("");

  return emailLayout(`
    <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi <strong>${params.name}</strong>,</p>
    <p style="font-size:13px;color:#555;margin:0 0 16px;">Your order <strong>#${params.orderId}</strong> has been confirmed!</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${itemsHtml}
      <tr><td style="border-top:2px solid #fd5000;padding:8px 0 0;font-size:14px;font-weight:700;color:#111;">Total</td><td style="border-top:2px solid #fd5000;padding:8px 0 0;font-size:14px;font-weight:700;color:#111;text-align:right;">${params.total}</td></tr>
    </table>
    <p style="margin:20px 0 0;">
      <a href="https://www.jimvio.com/orders/${params.orderId}" style="display:inline-block;padding:10px 24px;background:#fd5000;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">View Order</a>
    </p>
  `);
}

export function passwordResetEmail(params: {
  name: string;
  resetLink: string;
}): string {
  return emailLayout(`
    <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi <strong>${params.name}</strong>,</p>
    <p style="font-size:13px;color:#555;margin:0 0 16px;">We received a request to reset your password. Click the button below to set a new one.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${params.resetLink}" style="display:inline-block;padding:10px 24px;background:#fd5000;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">Reset Password</a>
    </p>
    <p style="font-size:12px;color:#888;margin:16px 0 0;">If you didn't request this, you can safely ignore this email.</p>
  `);
}

export function newMessageEmail(params: {
  recipientName: string;
  senderName: string;
  preview: string;
  conversationUrl: string;
}): string {
  return emailLayout(`
    <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi <strong>${params.recipientName}</strong>,</p>
    <p style="font-size:13px;color:#555;margin:0 0 8px;"><strong>${params.senderName}</strong> sent you a message:</p>
    <blockquote style="margin:8px 0 16px;padding:12px 16px;background:#f9f9f9;border-left:3px solid #fd5000;font-size:13px;color:#444;">
      ${params.preview}
    </blockquote>
    <p><a href="https://www.jimvio.com${params.conversationUrl}" style="display:inline-block;padding:10px 24px;background:#fd5000;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">View Message</a></p>
  `);
}

export function payoutNotificationEmail(params: {
  name: string;
  amount: string;
  method: string;
}): string {
  return emailLayout(`
    <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi <strong>${params.name}</strong>,</p>
    <p style="font-size:13px;color:#555;margin:0 0 8px;">A payout of <strong style="color:#16a34a;">${params.amount}</strong> has been sent to your <strong>${params.method}</strong> account.</p>
    <p style="font-size:12px;color:#888;">It may take 1&ndash;3 business days to appear depending on your payment provider.</p>
  `);
}

export function welcomeEmail(params: { name: string }): string {
  return emailLayout(`
    <p style="font-size:15px;color:#333;margin:0 0 16px;">Welcome to Jimvio, <strong>${params.name}</strong>! 🎉</p>
    <p style="font-size:13px;color:#555;margin:0 0 16px;">You're now part of a global creator-commerce ecosystem. Here's what you can do:</p>
    <ul style="font-size:13px;color:#555;padding-left:20px;">
      <li>Create or join <strong>communities</strong> and connect with like-minded creators</li>
      <li>Set up your <strong>storefront</strong> and sell physical &amp; digital products</li>
      <li>Participate in <strong>UGC campaigns</strong> and earn from brand partnerships</li>
      <li>Go <strong>live</strong> and engage with your audience in real time</li>
    </ul>
    <p style="margin:20px 0 0;">
      <a href="https://www.jimvio.com/dashboard" style="display:inline-block;padding:10px 24px;background:#fd5000;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">Go to Dashboard</a>
    </p>
  `);
}

export function affiliateSignupEmail(params: {
  name: string;
  vendorName: string;
  commissionRate: string;
}): string {
  return emailLayout(`
    <p style="font-size:15px;color:#333;margin:0 0 16px;">Hi <strong>${params.name}</strong>,</p>
    <p style="font-size:13px;color:#555;margin:0 0 16px;">You've signed up as an affiliate for <strong>${params.vendorName}</strong>! You'll earn <strong style="color:#16a34a;">${params.commissionRate}%</strong> on every sale you refer.</p>
    <p style="font-size:13px;color:#555;">Share your affiliate links and start earning today.</p>
  `);
}
