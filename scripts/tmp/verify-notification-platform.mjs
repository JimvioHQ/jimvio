/**
 * Notification platform smoke checks — no network.
 * Auto-picked up by ci:prepush via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function mustExist(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

mustExist("database/migrations/112_notification_platform.sql");
mustExist("supabase/migrations/20260726160000_notification_platform.sql");

const migration = mustExist("supabase/migrations/20260726160000_notification_platform.sql");
assert.match(migration, /notification_events/);
assert.match(migration, /get_unread_notification_count/);
assert.match(migration, /quiet_hours_enabled/);
assert.match(migration, /uq_notifications_user_event_key/);
assert.match(migration, /archived_at/);
assert.match(migration, /group_key/);

const platform = mustExist("lib/notifications/platform.ts");
assert.match(platform, /publishNotification/);
assert.match(platform, /tryGroupExisting|group_key/);
assert.match(platform, /isInQuietHours/);
assert.match(platform, /rateLimit/);
assert.match(platform, /trackNotificationEvent/);

const notifyUser = mustExist("lib/notifications/notify-user.ts");
assert.match(notifyUser, /publishNotification/);
assert.match(notifyUser, /inferCategory/);

const publishers = mustExist("lib/notifications/publishers.ts");
assert.match(publishers, /notifyNewMessage/);
assert.match(publishers, /notifyMention/);
assert.match(publishers, /notifyCommunityInvite/);
assert.match(publishers, /notifySpaceInvite/);
assert.match(publishers, /notifyCourseEnrollment/);
assert.match(publishers, /notifyLessonCompleted/);
assert.match(publishers, /notifyCertificateIssued/);
assert.match(publishers, /notifyAffiliateCommission/);
assert.match(publishers, /notifyAdminAnnouncement/);
assert.match(publishers, /notifyShippingUpdate/);
assert.match(publishers, /notifyRefund/);

const activity = mustExist("lib/notifications/activity.ts");
assert.match(activity, /getActivityFeed/);
assert.match(activity, /getUnreadCount/);

const analytics = mustExist("lib/notifications/analytics.ts");
assert.match(analytics, /getUserNotificationAnalytics/);
assert.match(analytics, /ctr/);
assert.match(analytics, /engagement/);

const prefs = mustExist("lib/notifications/preferences.ts");
assert.match(prefs, /quiet_hours/);
assert.match(prefs, /sms_enabled/);
assert.match(prefs, /isCategoryEnabled/);

const realtime = mustExist("lib/notifications/realtime.ts");
assert.match(realtime, /subscribeUserNotifications/);
assert.match(realtime, /SUBSCRIBED/);

mustExist("app/api/notifications/route.ts");
mustExist("app/api/notifications/[id]/route.ts");
mustExist("app/api/notifications/mark-all-read/route.ts");
mustExist("app/api/notifications/unread-count/route.ts");
mustExist("app/api/notifications/preferences/route.ts");
mustExist("app/api/notifications/analytics/route.ts");
mustExist("app/api/notifications/admin/announce/route.ts");

const actions = mustExist("lib/actions/notifications.ts");
assert.match(actions, /archiveNotification/);
assert.match(actions, /trackNotificationClick/);

const page = mustExist("app/inbox/page.tsx");
assert.match(page, /groupActivityByDate/);
assert.match(page, /subscribeUserNotifications/);
assert.match(page, /Load more|loadNotifications/);

console.log("verify-notification-platform: ok");
