import { getAdminDB } from "@/services/base";

export type FeedbackCategory = "feedback" | "bug" | "feature";
export type FeedbackStatus = "open" | "triaged" | "resolved" | "wontfix";

export type ProductFeedbackInput = {
  userId: string | null;
  category: FeedbackCategory;
  message: string;
  pagePath?: string | null;
  userAgent?: string | null;
};

const db = () => getAdminDB() as any;

export function normalizeFeedbackMessage(message: string): string {
  return message.trim().slice(0, 4000);
}

export async function createProductFeedback(input: ProductFeedbackInput) {
  const message = normalizeFeedbackMessage(input.message);
  if (message.length < 3) throw new Error("Message too short");
  if (!["feedback", "bug", "feature"].includes(input.category)) {
    throw new Error("Invalid category");
  }

  const { data, error } = await db()
    .from("product_feedback")
    .insert({
      user_id: input.userId,
      category: input.category,
      message,
      page_path: input.pagePath?.slice(0, 500) ?? null,
      user_agent: input.userAgent?.slice(0, 500) ?? null,
      status: "open",
    })
    .select("id, category, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listProductFeedback(limit = 50) {
  const { data, error } = await db()
    .from("product_feedback")
    .select("id, user_id, category, message, page_path, status, admin_notes, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));
  if (error) throw error;
  return data ?? [];
}

export async function updateProductFeedbackStatus(
  id: string,
  status: FeedbackStatus,
  adminNotes?: string | null,
) {
  const { data, error } = await db()
    .from("product_feedback")
    .update({
      status,
      admin_notes: adminNotes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, status, updated_at")
    .single();
  if (error) throw error;
  return data;
}
