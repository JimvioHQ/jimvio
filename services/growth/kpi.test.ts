import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distinctUsersSince, scoreNps, windowStart } from "./kpi";

describe("growth kpi math", () => {
  it("counts distinct users inside a UTC window and scores NPS", () => {
    const now = new Date("2026-10-25T15:00:00.000Z");
    assert.equal(windowStart(1, now), "2026-10-25T00:00:00.000Z");
    assert.equal(windowStart(7, now), "2026-10-19T00:00:00.000Z");
    const rows = [
      { user_id: "a", created_at: "2026-10-25T01:00:00.000Z" },
      { user_id: "a", created_at: "2026-10-25T02:00:00.000Z" },
      { user_id: "b", created_at: "2026-10-24T02:00:00.000Z" },
      { user_id: null, created_at: "2026-10-25T02:00:00.000Z" },
    ];
    assert.equal(distinctUsersSince(rows, windowStart(1, now)), 1);
    assert.equal(distinctUsersSince(rows, windowStart(7, now)), 2);
    assert.deepEqual(scoreNps([]), { nps: null, responses: 0 });
    assert.deepEqual(scoreNps([10, 9, 0, 11]), { nps: 33, responses: 3 });
  });
});
