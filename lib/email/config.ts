export function getAppBaseUrl(): string {
    const explicit =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.NEXT_PUBLIC_SITE_URL;
    if (explicit) return explicit.replace(/\/$/, "");

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
    }

    if (process.env.NODE_ENV === "production") {
        return "https://www.jimvio.com";
    }

    return "http://localhost:3000";
}

export function getEmailFromAddress(): string {
    return process.env.EMAIL_FROM ?? "Jimvio <notifications@jimvio.com>";
}

export function isEmailEnabled(): boolean {
    if (process.env.EMAIL_NOTIFICATIONS_ENABLED === "false") return false;
    return Boolean(process.env.RESEND_API_KEY?.trim());
}
