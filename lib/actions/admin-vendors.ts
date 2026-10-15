
"use server";

import { revalidatePath } from "next/cache";
import { getAdminDB } from "@/lib/supabase/admin";
import { assertAdminAccess } from "@/lib/cj/premium-intelligence/super-admin-auth";
import { writeAuditEvent } from "@/services/ops/audit";
import { physicalSellingStatus } from "@/lib/products/physical-selling";

async function requireAdminAction() {
    const auth = await assertAdminAccess();
    if (!auth.ok) return { error: auth.error };
    return { user: auth.user };
}

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function approveVendor(vendorId: string, notes?: string) {
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };

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

        try {
            const { notifyAdminAnnouncement } = await import("@/lib/notifications/publishers");
            await notifyAdminAnnouncement({
                userIds: [vendor.user_id],
                title: "Vendor approved",
                message: "Your vendor account has been verified. You can start selling on Jimvio.",
                actionUrl: "/",
                announcementId: `vendor-approved-${vendorId}`,
            });
        } catch (err) {
            console.warn("[approveVendor] notification skipped:", err);
        }
    }

    revalidatePath("/admin/verifications");
    revalidatePath(`/admin/vendors/${vendorId}`);
    return { success: true };
}

export async function rejectVendor(vendorId: string, notes: string) {
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };

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

    try {
        const { data: vendor } = await admin
            .from("vendors")
            .select("user_id")
            .eq("id", vendorId)
            .maybeSingle();
        if (vendor?.user_id) {
            const { notifyAdminAnnouncement } = await import("@/lib/notifications/publishers");
            await notifyAdminAnnouncement({
                userIds: [vendor.user_id],
                title: "Vendor application update",
                message: notes?.trim()
                    ? `Your vendor application was not approved: ${notes.trim()}`
                    : "Your vendor application was not approved.",
                actionUrl: "/",
                announcementId: `vendor-rejected-${vendorId}`,
            });
        }
    } catch (err) {
        console.warn("[rejectVendor] notification skipped:", err);
    }

    revalidatePath("/admin/verifications");
    revalidatePath(`/admin/vendors/${vendorId}`);
    return { success: true };
}

export async function suspendVendor(vendorId: string, notes: string) {
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };

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
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };

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
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };

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
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };

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
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };

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
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };

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
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };

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
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };

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
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };

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
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };

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
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };

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
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };

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

export async function setPhysicalSellingAccess(
    vendorId: string,
    decision: "approved" | "rejected" | "suspended",
    notes?: string,
) {
    const gate = await requireAdminAction();
    if (gate.error) return { success: false, error: gate.error };
    const actorId = gate.user?.id ?? null;

    const admin = getAdminDB();
    const { data: vendor } = await admin
        .from("vendors")
        .select("id, user_id, is_active, verification_status")
        .eq("id", vendorId)
        .maybeSingle();
    if (!vendor) return { success: false, error: "Vendor not found" };
    if (decision === "approved" && vendor.is_active === false) {
        return {
            success: false,
            error: "This seller account is inactive. Approval cannot bypass that restriction.",
        };
    }

    const verification_status =
        decision === "approved" ? "verified" : decision === "rejected" ? "rejected" : "suspended";
    const now = new Date().toISOString();
    const { error } = await admin
        .from("vendors")
        .update({
            verification_status,
            verification_notes: notes?.trim() || null,
            verified_at: decision === "approved" ? now : null,
            physical_selling_reviewed_at: now,
            physical_selling_reviewed_by: actorId,
        } as any)
        .eq("id", vendorId);
    if (error) return { success: false, error: error.message };

    await writeAuditEvent({
        actorId,
        action: `physical_selling.${decision}`,
        entityType: "vendor",
        entityId: vendorId,
        metadata: {
            userId: vendor.user_id,
            previous: vendor.verification_status,
            next: verification_status,
            notes: notes?.trim() || null,
        },
    });

    revalidatePath("/admin/vendors");
    revalidatePath(`/admin/vendors/${vendorId}`);
    revalidatePath("/admin/verifications");
    return { success: true, status: physicalSellingStatus({ verification_status }) };
}