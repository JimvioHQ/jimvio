import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyUser } from "@/lib/notifications/notify-user";

export async function notifyCreatorApplicationSubmitted(
  db: SupabaseClient,
  userId: string,
  campaignTitle: string,
  campaignId: string,
) {
  await notifyUser(db, {
    userId,
    type: "influencer",
    title: "Application submitted",
    message: `Your application for "${campaignTitle}" is pending review.`,
    actionUrl: `/ugc/${campaignId}/application`,
    data: { campaignId, event: "application_submitted" },
  });
}

export async function notifyCreatorApplicationApproved(
  db: SupabaseClient,
  userId: string,
  campaignTitle: string,
  campaignId: string,
) {
  await notifyUser(db, {
    userId,
    type: "influencer",
    title: "Application approved",
    message: `You're in! Your project for "${campaignTitle}" is ready.`,
    actionUrl: `/ugc/${campaignId}/dashboard`,
    data: { campaignId, event: "application_approved" },
  });
}

export async function notifyCreatorApplicationRejected(
  db: SupabaseClient,
  userId: string,
  campaignTitle: string,
  campaignId: string,
  feedback?: string,
) {
  await notifyUser(db, {
    userId,
    type: "influencer",
    title: "Application update",
    message: feedback
      ? `Your application for "${campaignTitle}" was not approved: ${feedback}`
      : `Your application for "${campaignTitle}" was not approved.`,
    actionUrl: `/ugc/${campaignId}/application`,
    data: { campaignId, event: "application_rejected" },
  });
}

export async function notifyCreatorWaitlisted(
  db: SupabaseClient,
  userId: string,
  campaignTitle: string,
  campaignId: string,
) {
  await notifyUser(db, {
    userId,
    type: "influencer",
    title: "Added to waitlist",
    message: `You've been waitlisted for "${campaignTitle}". We'll notify you if a spot opens.`,
    actionUrl: `/ugc/${campaignId}/application`,
    data: { campaignId, event: "application_waitlisted" },
  });
}

export async function notifyVendorNewApplication(
  db: SupabaseClient,
  vendorUserId: string,
  campaignTitle: string,
  campaignId: string,
) {
  await notifyUser(db, {
    userId: vendorUserId,
    type: "system",
    title: "New campaign application",
    message: `A creator applied to "${campaignTitle}".`,
    actionUrl: `/dashboard/vendor/campaigns/${campaignId}/applications`,
    data: { campaignId, event: "new_application" },
  });
}

export async function notifyCreatorProjectCreated(
  db: SupabaseClient,
  userId: string,
  campaignTitle: string,
  campaignId: string,
) {
  await notifyUser(db, {
    userId,
    type: "influencer",
    title: "Project created",
    message: `Your active project for "${campaignTitle}" is ready. Start creating!`,
    actionUrl: `/ugc/${campaignId}/dashboard`,
    data: { campaignId, event: "project_created" },
  });
}
