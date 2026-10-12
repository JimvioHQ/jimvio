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
    eventKey: `ugc.application.submitted:${campaignId}:${userId}`,
    email: {
      kind: "account_notice",
      subject: `Application received — ${campaignTitle}`,
      titleLead: "Application ",
      titleAccent: "received",
      subtitle: `Your application for "${campaignTitle}" is pending review.`,
      noticeTitle: "What happens next",
      noticeBody: "The brand will review your application. You'll get another email if you are accepted or declined.",
      ctaLabel: "View application",
      actionPath: `/ugc/${campaignId}/application`,
      icon: "compass",
      idempotencyKey: `ugc.application.submitted:${campaignId}:${userId}`,
    },
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
    eventKey: `ugc.application.approved:${campaignId}:${userId}`,
    email: {
      kind: "account_notice",
      subject: `Application accepted — ${campaignTitle}`,
      titleLead: "You're ",
      titleAccent: "in",
      subtitle: `Your application for "${campaignTitle}" was accepted.`,
      noticeTitle: "Next step",
      noticeBody: "Open the campaign workspace and start creating.",
      ctaLabel: "Open campaign",
      actionPath: `/ugc/${campaignId}/dashboard`,
      icon: "shield-check",
      idempotencyKey: `ugc.application.approved:${campaignId}:${userId}`,
    },
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
    eventKey: `ugc.application.rejected:${campaignId}:${userId}`,
    email: {
      kind: "account_notice",
      subject: `Application update — ${campaignTitle}`,
      titleLead: "Application ",
      titleAccent: "update",
      subtitle: `Your application for "${campaignTitle}" was not approved.`,
      noticeTitle: "Details",
      noticeBody: feedback?.trim() || "You can review the campaign and apply again if it is still open.",
      ctaLabel: "View campaign",
      actionPath: `/ugc/${campaignId}/application`,
      icon: "alert",
      idempotencyKey: `ugc.application.rejected:${campaignId}:${userId}`,
    },
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
    actionUrl: `/ugc/campaign-center/campaigns/${campaignId}/applications`,
    data: { campaignId, event: "new_application" },
    email: {
      kind: "account_notice",
      subject: `New application — ${campaignTitle}`,
      titleLead: "New ",
      titleAccent: "application",
      subtitle: `A creator applied to "${campaignTitle}".`,
      noticeTitle: "Review",
      noticeBody: "Open the campaign to accept or decline the application.",
      ctaLabel: "Review applications",
      actionPath: `/ugc/campaign-center/campaigns/${campaignId}/applications`,
      icon: "compass",
    },
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
