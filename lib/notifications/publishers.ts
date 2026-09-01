/**
 * Module-facing notification publishers — Communities, Messaging, Spaces,
 * Live, Courses, Marketplace, Orders, Affiliate, Admin.
 */

import { publishNotification, publishMany } from "@/lib/notifications/platform";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function db() {
  return createServiceRoleClient() as any;
}

export async function notifyNewMessage(input: {
  userId: string;
  actorId: string;
  actorName: string;
  preview: string;
  actionUrl: string;
  conversationId?: string;
}) {
  return publishNotification({
    userId: input.userId,
    actorId: input.actorId,
    category: "new_message",
    title: "New message",
    message: `${input.actorName}: ${input.preview}`.slice(0, 240),
    actionUrl: input.actionUrl,
    groupKey: input.conversationId
      ? `msg:${input.userId}:${input.conversationId}`
      : `msg:${input.userId}:${input.actorId}`,
    data: {
      event: "new_message",
      conversationId: input.conversationId,
      actorId: input.actorId,
    },
  });
}

export async function notifyMention(input: {
  userId: string;
  actorId: string;
  actorName: string;
  actionUrl: string;
  context?: string;
}) {
  return publishNotification({
    userId: input.userId,
    actorId: input.actorId,
    category: "mention",
    title: "You were mentioned",
    message: `${input.actorName} mentioned you${input.context ? ` in ${input.context}` : ""}`,
    actionUrl: input.actionUrl,
    groupKey: `mention:${input.userId}:${input.actorId}`,
    data: { event: "mention", actorId: input.actorId },
  });
}

export async function notifyReply(input: {
  userId: string;
  actorId: string;
  actorName: string;
  actionUrl: string;
  preview?: string;
}) {
  return publishNotification({
    userId: input.userId,
    actorId: input.actorId,
    category: "reply",
    title: "New reply",
    message: input.preview
      ? `${input.actorName} replied: ${input.preview}`.slice(0, 240)
      : `${input.actorName} replied to you`,
    actionUrl: input.actionUrl,
    groupKey: `reply:${input.userId}`,
    data: { event: "reply", actorId: input.actorId, is_reply: true },
  });
}

export async function notifyReaction(input: {
  userId: string;
  actorId: string;
  actorName: string;
  actionUrl: string;
  emoji?: string;
}) {
  return publishNotification({
    userId: input.userId,
    actorId: input.actorId,
    category: "reaction",
    title: "New reaction",
    message: `${input.actorName} reacted${input.emoji ? ` ${input.emoji}` : ""}`,
    actionUrl: input.actionUrl,
    groupKey: `reaction:${input.userId}:${input.actionUrl}`,
    data: { event: "reaction", actorId: input.actorId, emoji: input.emoji },
  });
}

export async function notifyCommunityInvite(input: {
  userId: string;
  actorId: string;
  communityName: string;
  communitySlug: string;
  inviteCode?: string;
}) {
  return publishNotification({
    userId: input.userId,
    actorId: input.actorId,
    category: "community_invite",
    title: "Community invite",
    message: `You've been invited to join ${input.communityName}`,
    actionUrl: input.inviteCode
      ? `/communities/${input.communitySlug}?invite=${input.inviteCode}`
      : `/communities/${input.communitySlug}`,
    eventKey: input.inviteCode
      ? `community_invite:${input.userId}:${input.inviteCode}`
      : undefined,
    data: {
      event: "community_invite",
      inviteCode: input.inviteCode,
      actorId: input.actorId,
    },
  });
}

export async function notifySpaceInvite(input: {
  userId: string;
  actorId: string;
  spaceName: string;
  actionUrl: string;
  spaceId?: string;
}) {
  return publishNotification({
    userId: input.userId,
    actorId: input.actorId,
    category: "space_invite",
    title: "Space invite",
    message: `You've been invited to ${input.spaceName}`,
    actionUrl: input.actionUrl,
    eventKey: input.spaceId
      ? `space_invite:${input.userId}:${input.spaceId}`
      : undefined,
    data: { event: "space_invite", spaceId: input.spaceId, actorId: input.actorId },
  });
}

export async function notifyCourseEnrollment(input: {
  userId: string;
  courseId: string;
  courseTitle: string;
  actionUrl?: string;
}) {
  return publishNotification({
    userId: input.userId,
    category: "course_enrollment",
    title: "Course enrollment",
    message: `You're enrolled in ${input.courseTitle}`,
    actionUrl: input.actionUrl ?? `/library`,
    eventKey: `course_enrollment:${input.userId}:${input.courseId}`,
    data: { event: "course_enrollment", courseId: input.courseId },
  });
}

export async function notifyLessonCompleted(input: {
  userId: string;
  courseId: string;
  lessonId: string;
  lessonTitle?: string;
  actionUrl?: string;
}) {
  return publishNotification({
    userId: input.userId,
    category: "lesson_completed",
    title: "Lesson completed",
    message: input.lessonTitle
      ? `You completed “${input.lessonTitle}”`
      : "You completed a lesson",
    actionUrl: input.actionUrl ?? `/library`,
    eventKey: `lesson_completed:${input.userId}:${input.lessonId}`,
    data: {
      event: "lesson_completed",
      courseId: input.courseId,
      lessonId: input.lessonId,
    },
  });
}

export async function notifyCertificateIssued(input: {
  userId: string;
  courseId: string;
  certificateCode: string;
  courseTitle?: string;
}) {
  return publishNotification({
    userId: input.userId,
    category: "certificate_issued",
    title: "Certificate issued",
    message: input.courseTitle
      ? `Your certificate for ${input.courseTitle} is ready`
      : "Your course certificate is ready",
    actionUrl: `/api/certificates/${input.certificateCode}`,
    eventKey: `certificate:${input.userId}:${input.courseId}`,
    data: {
      event: "certificate_issued",
      courseId: input.courseId,
      certificateCode: input.certificateCode,
    },
  });
}

export async function notifyProductPurchased(input: {
  userId: string;
  orderId: string;
  orderNumber: string;
  productLabel?: string;
}) {
  return publishNotification({
    userId: input.userId,
    category: "product_purchased",
    title: "Purchase confirmed",
    message: input.productLabel
      ? `You purchased ${input.productLabel}`
      : `Order ${input.orderNumber} is confirmed`,
    actionUrl: `/orders/${input.orderId}`,
    eventKey: `product_purchased:${input.orderId}`,
    data: { event: "product_purchased", orderId: input.orderId },
  });
}

export async function notifyOrderUpdate(input: {
  userId: string;
  orderId: string;
  orderNumber: string;
  status: string;
}) {
  return publishNotification({
    userId: input.userId,
    category: "order_update",
    title: "Order update",
    message: `Order ${input.orderNumber} is now ${input.status}`,
    actionUrl: `/orders/${input.orderId}`,
    groupKey: `order:${input.orderId}`,
    eventKey: `order_update:${input.orderId}:${input.status}`,
    data: { event: "order_update", orderId: input.orderId, status: input.status },
  });
}

export async function notifyShippingUpdate(input: {
  userId: string;
  orderId: string;
  orderNumber: string;
  trackingNumber?: string | null;
}) {
  return publishNotification({
    userId: input.userId,
    category: "shipping_update",
    title: "Shipping update",
    message: input.trackingNumber
      ? `Order ${input.orderNumber} shipped · ${input.trackingNumber}`
      : `Order ${input.orderNumber} has shipped`,
    actionUrl: `/orders/${input.orderId}`,
    eventKey: `shipping:${input.orderId}:${input.trackingNumber ?? "shipped"}`,
    data: {
      event: "shipping_update",
      orderId: input.orderId,
      tracking_number: input.trackingNumber,
      status: "shipped",
    },
  });
}

export async function notifyRefund(input: {
  userId: string;
  orderId: string;
  orderNumber: string;
  amountLabel?: string;
}) {
  return publishNotification({
    userId: input.userId,
    category: "refund",
    title: "Refund processed",
    message: input.amountLabel
      ? `A refund of ${input.amountLabel} was issued for order ${input.orderNumber}`
      : `A refund was issued for order ${input.orderNumber}`,
    actionUrl: `/orders/${input.orderId}`,
    eventKey: `refund:${input.orderId}`,
    data: { event: "refund", orderId: input.orderId },
  });
}

export async function notifyAffiliateCommission(input: {
  affiliateUserId: string;
  amount: number;
  currency?: string;
  commissionId?: string;
  status: "pending" | "approved" | "rejected" | "refunded";
}) {
  const currency = input.currency ?? "USD";
  const label = `${currency} ${input.amount.toFixed(2)}`;
  return publishNotification({
    userId: input.affiliateUserId,
    category: "affiliate_commission",
    title: "Affiliate commission",
    message: `Commission ${input.status}: ${label}`,
    actionUrl: "/affiliatess",
    eventKey: input.commissionId
      ? `affiliate_commission:${input.commissionId}:${input.status}`
      : undefined,
    data: {
      event: "affiliate_commission",
      commissionId: input.commissionId,
      status: input.status,
      amount: input.amount,
    },
  });
}

export async function notifyCampaignUpdate(input: {
  userId: string;
  campaignId: string;
  campaignName: string;
  status: string;
}) {
  return publishNotification({
    userId: input.userId,
    category: "campaign_update",
    title: "Campaign update",
    message: `Campaign “${input.campaignName}” is now ${input.status}`,
    actionUrl: "/affiliatess",
    eventKey: `campaign:${input.campaignId}:${input.status}`,
    data: {
      event: "campaign_update",
      campaignId: input.campaignId,
      status: input.status,
    },
  });
}

export async function notifyAdminAnnouncement(input: {
  userIds: string[];
  title: string;
  message: string;
  actionUrl?: string;
  announcementId?: string;
}) {
  const unique = Array.from(new Set(input.userIds.filter(Boolean)));
  return publishMany(
    unique.map((userId) => ({
      userId,
      category: "admin_announcement" as const,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? "/settings/notifications",
      force: true,
      eventKey: input.announcementId
        ? `admin_announcement:${userId}:${input.announcementId}`
        : undefined,
      data: {
        event: "admin_announcement",
        announcement: true,
        announcementId: input.announcementId,
      },
    }))
  );
}

/** Resolve profile id by email for invite notifications. */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const { data } = await db()
    .from("profiles")
    .select("id")
    .ilike("email", normalized)
    .limit(1)
    .maybeSingle();
  return (data?.id as string) ?? null;
}
