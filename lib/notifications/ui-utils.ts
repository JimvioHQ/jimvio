import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/types/supabase";

export type DbNotification = Database["public"]["Tables"]["notifications"]["Row"];

/** UI filter tabs — maps DB enum values into display categories. */
export type NotificationUiCategory =
    | "order"
    | "shipping"
    | "message"
    | "payment"
    | "system";

export function getNotificationUiCategory(n: Pick<DbNotification, "type" | "title" | "data">): NotificationUiCategory {
    const data = (n.data ?? {}) as Record<string, unknown>;
    const title = (n.title ?? "").toLowerCase();

    if (n.type === "message") return "message";
    if (n.type === "payment" || n.type === "affiliate") return "payment";
    if (
        title.includes("shipped") ||
        data.status === "shipped" ||
        Boolean(data.tracking_number)
    ) {
        return "shipping";
    }
    if (n.type === "order") return "order";
    if (n.type === "system" || n.type === "review" || n.type === "community" || n.type === "influencer") {
        return "system";
    }
    return "system";
}

export function formatNotificationTime(iso: string | null | undefined): string {
    if (!iso) return "";
    try {
        return formatDistanceToNow(new Date(iso), { addSuffix: true });
    } catch {
        return "";
    }
}
