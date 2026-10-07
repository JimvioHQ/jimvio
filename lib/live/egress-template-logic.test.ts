import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEgressTiles,
  decideEgressStartSignal,
  type EgressPubSnapshot,
} from "./egress-template-logic.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function pub(partial: Partial<EgressPubSnapshot> & Pick<EgressPubSnapshot, "identity">): EgressPubSnapshot {
  return {
    name: partial.name ?? partial.identity,
    source: partial.source ?? "camera",
    kind: partial.kind ?? "video",
    subscribed: partial.subscribed ?? false,
    hasTrack: partial.hasTrack ?? false,
    framesDecoded: partial.framesDecoded ?? 0,
    identity: partial.identity,
  };
}

describe("egress template screen-share logic", () => {
  it("prefers subscribed screen share as the primary tile", () => {
    const tiles = buildEgressTiles([
      pub({
        identity: "host",
        source: "camera",
        subscribed: true,
        hasTrack: true,
        framesDecoded: 10,
      }),
      pub({
        identity: "host",
        source: "screen",
        subscribed: true,
        hasTrack: true,
        framesDecoded: 20,
      }),
    ]);
    assert.equal(tiles[0]?.kind, "video");
    if (tiles[0]?.kind === "video") {
      assert.equal(tiles[0].screen, true);
    }
    assert.ok(tiles.some((t) => t.kind === "video" && !t.screen));
  });

  it("does not avatar-fallback while screen share is published but not subscribed", () => {
    const tiles = buildEgressTiles([
      pub({
        identity: "host",
        source: "screen",
        subscribed: false,
        hasTrack: false,
      }),
    ]);
    assert.equal(tiles.length, 0);
  });

  it("waits for screen frames when screen share is published", () => {
    const waiting = decideEgressStartSignal({
      elapsedMs: 1_000,
      pubs: [
        pub({
          identity: "host",
          source: "screen",
          subscribed: true,
          hasTrack: true,
          framesDecoded: 0,
        }),
      ],
    });
    assert.equal(waiting.shouldStart, false);
    assert.equal(waiting.reason, "wait_screen_frames");

    const ready = decideEgressStartSignal({
      elapsedMs: 1_000,
      pubs: [
        pub({
          identity: "host",
          source: "screen",
          subscribed: true,
          hasTrack: true,
          framesDecoded: 12,
        }),
      ],
    });
    assert.equal(ready.shouldStart, true);
    assert.equal(ready.reason, "screen_frames_decoded");
  });

  it("allows avatar-only start without published video", () => {
    const decision = decideEgressStartSignal({
      elapsedMs: 600,
      pubs: [pub({ identity: "host", kind: "other", source: "audio" })],
    });
    assert.equal(decision.shouldStart, true);
    assert.equal(decision.reason, "avatar_only_ready");
  });

  it("template disables adaptiveStream/dynacast and waits for frames", () => {
    const template = read("app/live/egress-template/page.tsx");
    assert.match(template, /adaptiveStream:\s*false/);
    assert.match(template, /dynacast:\s*false/);
    assert.match(template, /decideEgressStartSignal/);
    assert.match(template, /forceSubscribeVideos|setSubscribed\(true\)/);
    assert.match(template, /Waiting for screen|Screen/);
    assert.match(template, /START_RECORDING/);
  });
});
