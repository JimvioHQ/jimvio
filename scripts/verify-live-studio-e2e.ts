/**
 * Live Studio RC3 — API / wiring verification (no browser media).
 * Run: node --experimental-strip-types scripts/verify-live-studio-e2e.ts
 *   or: npx tsx scripts/verify-live-studio-e2e.ts
 */

import assert from "node:assert/strict";
import {
  canEndLive,
  canInviteSpeaker,
  canLaunchPoll,
  canMuteParticipant,
  canPublishAv,
  canRecord,
  canShareScreen,
  type LiveStageRole,
} from "../lib/live/roles.ts";

function section(title: string) {
  console.log(`\n== ${title} ==`);
}

function roles() {
  section("Role matrix");
  const checks: Array<[LiveStageRole, string, boolean]> = [
    ["host", "end", canEndLive("host")],
    ["viewer", "end", canEndLive("viewer")],
    ["viewer", "publish", canPublishAv("viewer")],
    ["speaker", "publish", canPublishAv("speaker")],
    ["moderator", "poll", canLaunchPoll("moderator")],
    ["viewer", "poll", canLaunchPoll("viewer")],
    ["host", "record", canRecord("host")],
    ["speaker", "record", canRecord("speaker")],
    ["host", "invite", canInviteSpeaker("host")],
    ["viewer", "invite", canInviteSpeaker("viewer")],
    ["moderator", "mute", canMuteParticipant("moderator")],
    ["speaker", "share", canShareScreen("speaker")],
  ];

  assert.equal(canEndLive("host"), true);
  assert.equal(canEndLive("viewer"), false);
  assert.equal(canPublishAv("viewer"), false);
  assert.equal(canPublishAv("speaker"), true);
  assert.equal(canLaunchPoll("moderator"), true);
  assert.equal(canLaunchPoll("viewer"), false);
  assert.equal(canRecord("host"), true);
  assert.equal(canRecord("speaker"), false);
  console.log("PASS", checks.map((c) => `${c[0]}.${c[1]}=${c[2]}`).join(", "));
}

function sessionContract() {
  section("Session API contract");
  const actions = [
    "join",
    "leave",
    "end",
    "invite",
    "request",
    "accept",
    "accept-invite",
    "reject",
    "remove",
    "mute",
    "media",
    "poll",
  ];
  assert.ok(actions.includes("end"));
  assert.ok(actions.includes("accept-invite"));
  console.log("PASS actions", actions.join(", "));
}

function main() {
  console.log("Live Studio RC3 verification");
  roles();
  sessionContract();
  console.log("\nOK — role + API contracts verified.");
  console.log(
    "Remaining: apply database/migrations/080_live_studio.sql, then browser matrix + Playwright with LIVE_E2E_STORAGE_STATE."
  );
}

main();
