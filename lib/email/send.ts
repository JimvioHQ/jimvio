import { getEmailFromAddress, isEmailEnabled } from "@/lib/email/config";

export type SendEmailInput = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};

export type SendEmailResult =
    | { ok: true; id?: string }
    | { ok: false; error: string; skipped?: boolean };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    if (!isEmailEnabled()) {
        return { ok: false, error: "Email not configured", skipped: true };
    }

    const apiKey = process.env.RESEND_API_KEY!.trim();

    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: getEmailFromAddress(),
                to: [input.to],
                subject: input.subject,
                html: input.html,
                text: input.text,
            }),
        });

        const payload = (await res.json().catch(() => ({}))) as { id?: string; message?: string };

        if (!res.ok) {
            console.error("[sendEmail] Resend error:", payload);
            return { ok: false, error: payload.message ?? `HTTP ${res.status}` };
        }

        return { ok: true, id: payload.id };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Send failed";
        console.error("[sendEmail]", message);
        return { ok: false, error: message };
    }
}
