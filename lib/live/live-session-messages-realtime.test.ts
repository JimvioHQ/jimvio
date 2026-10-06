import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = readFileSync(
  join(
    root,
    "supabase/migrations/20261006150000_publish_live_session_messages_realtime.sql"
  ),
  "utf8"
);

describe("live_session_messages realtime publication", () => {
  it("adds live_session_messages to supabase_realtime", () => {
    assert.match(migration, /ALTER PUBLICATION supabase_realtime ADD TABLE public\.live_session_messages/);
    assert.match(migration, /live_session_messages/);
  });
});
