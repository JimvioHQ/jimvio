
"use server";

import { revalidatePath } from "next/cache";
import { getAdminDB } from "@/lib/supabase/admin";

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function approveVendor(vendorId: string, notes?: string) {
    const admin = getAdminDB();
    const { error } = await admin
        .from("vendors")
        .update({
            verification_status: "verified",
            verification_notes: notes ?? null,
            verified_at: new Date().toISOString(),
            is_active: true,
        } as any)
        .eq("id", vendorId);

    if (error) return { success: false, error: error.message };

    // Ensure the user has the vendor role activated
    const { data: vendor } = await admin
        .from("vendors")
        .select("user_id")
        .eq("id", vendorId)
        .single();

    if (vendor?.user_id) {
        await admin.from("user_roles").upsert(
            {
                user_id: vendor.user_id,
                role: "vendor",
                is_active: true,
                activated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,role" }
        );
    }

    revalidatePath("/admin/verifications");
    revalidatePath(`/admin/vendors/${vendorId}`);
    return { success: true };
}

export async function rejectVendor(vendorId: string, notes: string) {
    const admin = getAdminDB();
    const { error } = await admin
        .from("vendors")
        .update({
            verification_status: "rejected",
            verification_notes: notes,
            is_active: false,
        } as any)
        .eq("id", vendorId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/verifications");
    revalidatePath(`/admin/vendors/${vendorId}`);
    return { success: true };
}

export async function suspendVendor(vendorId: string, notes: string) {
    const admin = getAdminDB();
    const { error } = await admin
        .from("vendors")
        .update({
            verification_status: "suspended",
            verification_notes: notes,
            is_active: false,
        } as any)
        .eq("id", vendorId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/verifications");
    revalidatePath(`/admin/vendors/${vendorId}`);
    return { success: true };
}

export async function revertVendorApproval(vendorId: string) {
    const admin = getAdminDB();
    const { error } = await admin
        .from("vendors")
        .update({
            verification_status: "pending",
            verification_notes: null,
            verified_at: null,
        } as any)
        .eq("id", vendorId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/verifications");
    return { success: true };
}

export async function toggleVendorFeatured(vendorId: string, featured: boolean) {
    const admin = getAdminDB();
    const { error } = await admin
        .from("vendors")
        .update({ is_featured: featured })
        .eq("id", vendorId);

    if (error) return { success: false, error: error.message };
    revalidatePath(`/admin/vendors/${vendorId}`);
    return { success: true };
}

export async function updateVendorCommission(vendorId: string, rate: number) {
    if (rate < 0 || rate > 100) return { success: false, error: "Rate must be 0–100" };
    const admin = getAdminDB();
    const { error } = await admin
        .from("vendors")
        .update({ commission_rate: rate })
        .eq("id", vendorId);

    if (error) return { success: false, error: error.message };
    revalidatePath(`/admin/vendors/${vendorId}`);
    return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATOR (INFLUENCER) ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function approveCreator(influencerId: string) {
    const admin = getAdminDB();

    // Fetch user_id so we can activate the influencer role
    const { data: influencer } = await admin
        .from("influencers")
        .select("user_id")
        .eq("id", influencerId)
        .single();

    const { error } = await admin
        .from("influencers")
        .update({ is_verified: true, is_active: true })
        .eq("id", influencerId);

    if (error) return { success: false, error: error.message };

    if (influencer?.user_id) {
        await admin.from("user_roles").upsert(
            {
                user_id: influencer.user_id,
                role: "influencer",
                is_active: true,
                activated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,role" }
        );
    }

    revalidatePath("/admin/verifications");
    return { success: true };
}

export async function rejectCreator(influencerId: string, reason: string) {
    const admin = getAdminDB();
    // Null out guidelines_accepted_at so they must re-accept before reapplying
    const { error } = await admin
        .from("influencers")
        .update({ is_verified: false, guidelines_accepted_at: null })
        .eq("id", influencerId);

    if (error) return { success: false, error: error.message };

    // TODO: send notification to the influencer with the reason
    revalidatePath("/admin/verifications");
    return { success: true };
}

export async function suspendCreator(influencerId: string, reason: string) {
    const admin = getAdminDB();
    const { error } = await admin
        .from("influencers")
        .update({ is_active: false, is_verified: false })
        .eq("id", influencerId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/verifications");
    return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// UGC SUBMISSION ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function approveUGCSubmission(submissionId: string, reviewerId: string) {
    const admin = getAdminDB();
    const { error } = await admin
        .from("ugc_submissions")
        .update({
            status: "approved",
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/verifications");
    return { success: true };
}

export async function rejectUGCSubmission(
    submissionId: string,
    reviewerId: string,
    reason: string
) {
    const admin = getAdminDB();
    const { error } = await admin
        .from("ugc_submissions")
        .update({
            status: "rejected",
            rejection_reason: reason,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/verifications");
    return { success: true };
}

export async function removeUGCSubmission(submissionId: string, reviewerId: string) {
    const admin = getAdminDB();
    const { error } = await admin
        .from("ugc_submissions")
        .update({
            status: "removed",
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/verifications");
    return { success: true };
}

export async function flagUGCSubmissionSuspicious(submissionId: string, score: number) {
    const admin = getAdminDB();
    const { error } = await admin
        .from("ugc_submissions")
        .update({ is_suspicious: true, fraud_score: score })
        .eq("id", submissionId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/verifications");
    return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveReport(
    reportId: string,
    reviewerId: string,
    action: "dismissed" | "actioned"
) {
    const admin = getAdminDB();
    const { error } = await admin
        .from("ugc_reports")
        .update({
            status: action,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/verifications");
    return { success: true };
}