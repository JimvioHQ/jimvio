/** Format unknown errors for admin heal logs (avoids empty `{}` in console). */
export function formatHealError(err: unknown): string {
    if (err instanceof Error && err.message.trim()) {
        return err.message;
    }
    if (typeof err === "string" && err.trim()) {
        return err;
    }
    if (err && typeof err === "object") {
        const record = err as Record<string, unknown>;
        if (typeof record.message === "string" && record.message.trim()) {
            return record.message;
        }
        if (typeof record.error === "string" && record.error.trim()) {
            return record.error;
        }
        try {
            const serialized = JSON.stringify(record);
            if (serialized && serialized !== "{}") return serialized;
        } catch {
            /* ignore */
        }
    }
    return "unknown verification error";
}
