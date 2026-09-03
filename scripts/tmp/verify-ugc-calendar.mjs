/**
 * Creator Calendar: real dates only, existing UGC APIs, EN/FR/RW i18n.
 * Auto-picked up by npm test via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const api = read("app/api/ugc/calendar/route.ts");
const page = read("components/ugc/workspace/UGCCalendarPage.tsx");
const helpers = read("lib/ugc/calendar.ts");
const messages = read("lib/ugc/i18n/messages.ts");
const route = read("app/ugc/calendar/page.tsx");
const sidebar = read("components/ugc/workspace/UGCWorkspaceSidebar.tsx");

assert.match(route, /redirect\("\/ugc\/campaigns\?view=schedule"\)/);
assert.doesNotMatch(sidebar, /href: "\/ugc\/calendar"/);
const myCampaigns = read("components/ugc/workspace/UGCMyCampaignsPage.tsx");
assert.match(myCampaigns, /UGCDateDetailPanel/);
assert.match(myCampaigns, /view=schedule|tab === "schedule"/);

assert.match(api, /needsProfile: true/);
assert.match(api, /requireUser/);
assert.match(api, /requireInfluencer/);
assert.match(api, /starts_at/);
assert.match(api, /ends_at/);
assert.match(api, /\.not\("paid_at", "is", null\)/);
assert.match(api, /type: "campaign_start"/);
assert.match(api, /type: "campaign_end"/);
assert.match(api, /type: "application_deadline"/);
assert.match(api, /type: "submission_deadline"/);
assert.match(api, /type: "payout"/);
assert.doesNotMatch(api, /review_deadline/);
assert.doesNotMatch(api, /type: "invitation"/);
assert.doesNotMatch(api, /paid_at \?\? .*created_at/);
assert.doesNotMatch(api, /ends_at \?\? inv\.created_at/);
assert.doesNotMatch(api, /inv\.created_at/);
assert.doesNotMatch(api, /amount/);
assert.doesNotMatch(api, /Deadline:/);
assert.doesNotMatch(api, /Payout \$\{/);
assert.match(api, /influencer_id/);
assert.match(helpers, /\/ugc\/earnings/);

assert.match(page, /json\.needsProfile === true/);
assert.match(page, /t\("noUpcomingEvents"\)/);
assert.match(page, /t\("noUpcomingEventsDesc"\)/);
assert.match(page, /t\("calendarLoadFailed"\)/);
assert.match(page, /t\("discoverCampaignsCta"\)/);
assert.match(page, /href="\/ugc"/);
assert.match(page, /href="\/identity\/edit"/);
assert.match(page, /t\("createCreatorProfile"\)/);
assert.match(page, /t\("calendarToday"\)/);
assert.match(page, /t\("calendarPrev"\)/);
assert.match(page, /t\("calendarNext"\)/);
assert.match(page, /aria-label=\{t\("calendarPrev"\)\}/);
assert.match(page, /aria-label=\{t\("calendarNext"\)\}/);
assert.match(page, /aria-label=\{t\("calendarToday"\)\}/);
assert.match(page, /fetch\("\/api\/ugc\/calendar"/);
assert.doesNotMatch(page, /from=/);
assert.doesNotMatch(page, /toLocaleString\(/);
assert.doesNotMatch(page, /fullcalendar|react-big-calendar/i);
assert.match(page, /error === "load_failed"/);
assert.match(page, /error === "sign_in"/);
assert.match(page, /Escape/);

const requiredKeys = [
  "calendarMonth",
  "calendarList",
  "calendarPrev",
  "calendarNext",
  "calendarToday",
  "noUpcomingEvents",
  "noUpcomingEventsDesc",
  "calendarLoadFailed",
  "eventCampaignStart",
  "eventCampaignEnd",
  "eventApplicationDeadline",
  "eventSubmissionDeadline",
  "eventPayoutDate",
  "calendarGroupToday",
  "calendarGroupTomorrow",
  "calendarGroupThisWeek",
  "calendarGroupLater",
  "discoverCampaignsCta",
];
for (const key of requiredKeys) {
  const matches = messages.match(new RegExp(`${key}:`, "g")) ?? [];
  assert.equal(matches.length, 3, `${key} must exist in EN/FR/RW`);
}

assert.match(helpers, /UGC_CALENDAR_EVENT_TYPES/);
assert.doesNotMatch(helpers, /review_deadline/);

async function loadCalendarHelpers() {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const src = read("lib/ugc/calendar.ts");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "calendar.ts",
  });
  const out = path.join(
    os.tmpdir(),
    `ugc-calendar-${process.pid}-${Math.random().toString(16).slice(2)}.mjs`,
  );
  fs.writeFileSync(out, outputText);
  return import(pathToFileURL(out).href);
}

const cal = await loadCalendarHelpers();

assert.equal(cal.isoHasAuthoritativeTime("2026-08-29"), false);
assert.equal(cal.isoHasAuthoritativeTime("2026-08-29T00:00:00.000Z"), false);
assert.equal(cal.isoHasAuthoritativeTime("2026-08-29T14:30:00.000Z"), true);

const dateOnly = cal.parseCalendarDate("2026-08-29");
assert.equal(dateOnly.getFullYear(), 2026);
assert.equal(dateOnly.getMonth(), 7);
assert.equal(dateOnly.getDate(), 29);

const utcMidnight = cal.parseCalendarDate("2026-08-29T00:00:00.000Z");
assert.equal(utcMidnight.getFullYear(), 2026);
assert.equal(utcMidnight.getMonth(), 7);
assert.equal(utcMidnight.getDate(), 29);

assert.equal(cal.calendarEventMatchesFilter("payout", "payouts"), true);
assert.equal(cal.calendarEventMatchesFilter("payout", "campaigns"), false);
assert.equal(cal.calendarEventMatchesFilter("submission_deadline", "submissions"), true);
assert.equal(cal.calendarEventMatchesFilter("campaign_start", "campaigns"), true);

assert.equal(
  cal.calendarEventHref({ type: "payout", campaignId: "c1" }),
  "/ugc/earnings",
);
assert.equal(
  cal.calendarEventHref({
    type: "submission_deadline",
    campaignId: "c1",
    participantStatus: "accepted",
  }),
  "/ugc/c1/submit",
);
assert.equal(
  cal.calendarEventHref({
    type: "application_deadline",
    campaignId: "c1",
    participantStatus: "pending",
  }),
  "/ugc/c1/application",
);
assert.equal(
  cal.calendarEventHref({
    type: "campaign_end",
    campaignId: "c1",
    participantStatus: "accepted",
  }),
  "/ugc/campaigns?view=schedule&campaign=c1",
);

const wednesday = new Date(2026, 7, 26, 12, 0, 0);
assert.equal(cal.upcomingListGroup(new Date(2026, 7, 25), wednesday, 0), null);
assert.equal(cal.upcomingListGroup(new Date(2026, 7, 26), wednesday, 0), "today");
assert.equal(cal.upcomingListGroup(new Date(2026, 7, 27), wednesday, 0), "tomorrow");
assert.equal(cal.upcomingListGroup(new Date(2026, 7, 28), wednesday, 0), "thisWeek");
assert.equal(cal.upcomingListGroup(new Date(2026, 7, 30), wednesday, 0), "later");

assert.equal(cal.weekStartForLocale("en"), 0);
assert.equal(cal.weekStartForLocale("fr"), 1);
assert.equal(cal.weekStartForLocale("rw"), 1);
assert.equal(cal.weekdayLabels("en", 0).length, 7);
assert.equal(cal.monthOffset(2026, 7, 0), 6);

assert.ok(cal.isSkippedCampaignStatus("draft"));
assert.ok(cal.isSkippedCampaignStatus("cancelled"));
assert.equal(cal.isSkippedCampaignStatus("active"), false);

console.log("verify-ugc-calendar: ok");
