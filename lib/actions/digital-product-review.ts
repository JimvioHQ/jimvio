"use server";

import { revalidatePath } from "next/cache";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import {
  applyReviewDecision,
  assignDigitalReviewer,
  listCustomerIssues,
  listDigitalReviewQueue,
  saveLicenseReview,
  updateCustomerIssue,
} from "@/lib/digital-products/trust/service";
import type { CustomerIssueStatus, LicenseRights } from "@/lib/digital-products/trust/types";

async function reviewer() {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return { ok: true as const, userId: auth.user.id };
}

export async function loadDigitalReviewQueue(input: { state?: string; q?: string; page?: number }) {
  const auth = await reviewer();
  if (!auth.ok) return { ok: false as const, error: auth.error, rows: [], total: 0 };
  const result = await listDigitalReviewQueue(input);
  return { ok: !result.error, error: result.error, rows: result.rows, total: result.total };
}

export async function loadDigitalCustomerIssues() {
  const auth = await reviewer();
  if (!auth.ok) return { ok: false as const, error: auth.error, rows: [] };
  return { ok: true as const, rows: await listCustomerIssues(30) };
}

export async function reviewDigitalLicense(input: {
  productId: string;
  accept: boolean;
  rights: LicenseRights;
  rationale: string;
}) {
  const auth = await reviewer();
  if (!auth.ok) return auth;
  const result = await saveLicenseReview({ ...input, reviewerId: auth.userId });
  if (result.ok) revalidatePath("/admin/digital-products");
  return result;
}

export async function decideDigitalProduct(input: {
  productId: string;
  action: "approve" | "request_changes" | "reject" | "publish" | "suspend" | "takedown" | "quarantine" | "reinstate" | "remove";
  expectedState: string;
  reason: string;
  internalNotes?: string;
  caseType?: string | null;
}) {
  const auth = await reviewer();
  if (!auth.ok) return auth;
  const result = await applyReviewDecision({ ...input, actorId: auth.userId });
  if (result.ok) {
    revalidatePath("/admin/digital-products");
    revalidatePath("/admin/products");
    revalidatePath("/marketplace");
  }
  return result;
}

export async function resolveDigitalCustomerIssue(input: {
  issueId: string;
  status: CustomerIssueStatus;
  resolution: string;
  refund?: boolean;
  revokeAccess?: boolean;
}) {
  const auth = await reviewer();
  if (!auth.ok) return auth;
  const result = await updateCustomerIssue({ ...input, actorId: auth.userId });
  if (result.ok) revalidatePath("/admin/digital-products");
  return result;
}

export async function assignDigitalProductReviewer(productId: string) {
  const auth = await reviewer();
  if (!auth.ok) return auth;
  const result = await assignDigitalReviewer({
    productId,
    actorId: auth.userId,
    assigneeId: auth.userId,
  });
  if (result.ok) revalidatePath("/admin/digital-products");
  return result;
}
