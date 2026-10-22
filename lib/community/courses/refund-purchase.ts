import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { revokeEnrollment } from "@/lib/community/courses/access";
import { isCoursePurchaseRefundStatus } from "@/lib/community/courses/purchase-policy";

type RefundInput = {
  paymentRef?: string | null;
  providerTransactionId?: string | null;
};

export type CourseRefundResult =
  | { handled: false }
  | { handled: true; courseId: string; userId: string; alreadyRefunded: boolean; enrollmentRevoked: boolean };

function dbClient(db?: SupabaseClient) {
  return db ?? createServiceRoleClient();
}

/**
 * Marks a confirmed course purchase refunded and revokes enrollment.
 * Replays are idempotent. Does not call a card processor.
 */
export async function refundCoursePurchase(
  db: SupabaseClient | undefined,
  input: RefundInput
): Promise<CourseRefundResult> {
  const client = dbClient(db);
  const keys = [input.paymentRef, input.providerTransactionId].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  if (!keys.length) return { handled: false };

  type CoursePurchaseTx = {
    id: string;
    user_id: string;
    status: string;
    reference: string | null;
    metadata: Record<string, unknown> | null;
    provider: string | null;
    amount: number;
  };

  let tx: CoursePurchaseTx | null = null;

  for (const key of keys) {
    const { data } = await client
      .from("transactions")
      .select("id, user_id, status, reference, metadata, provider, amount, type")
      .eq("type", "course_purchase")
      .eq("provider_transaction_id", key)
      .maybeSingle();
    if (data) {
      tx = data as unknown as CoursePurchaseTx;
      break;
    }
  }
  if (!tx) return { handled: false };

  const meta = (tx.metadata ?? {}) as { course_id?: string };
  const resolvedCourseId = String(meta.course_id || "");
  if (!resolvedCourseId) return { handled: false };

  const alreadyRefunded = isCoursePurchaseRefundStatus(tx.status);
  if (!alreadyRefunded) {
    await client
      .from("transactions")
      .update({
        status: "refunded",
        reference: `${String(tx.reference || keys[0]).slice(0, 70)}-refunded`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tx.id);

    if (tx.provider === "wallet") {
      const { data: wallet } = await client
        .from("wallets")
        .select("id")
        .eq("user_id", tx.user_id)
        .maybeSingle();
      if (wallet?.id) {
        await client.rpc("credit_wallet_available", {
          p_wallet_id: wallet.id,
          p_amount: Number(tx.amount),
        });
      }
    }
  }

  await revokeEnrollment(resolvedCourseId, tx.user_id, "refunded");
  await client
    .from("course_purchase_attempts")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("user_id", tx.user_id)
    .eq("course_id", resolvedCourseId)
    .eq("provider", tx.provider ?? "wallet");

  return {
    handled: true,
    courseId: resolvedCourseId,
    userId: tx.user_id,
    alreadyRefunded,
    enrollmentRevoked: true,
  };
}
