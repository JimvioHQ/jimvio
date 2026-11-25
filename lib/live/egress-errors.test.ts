import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeEgressStorageError } from "./egress-errors.ts";

describe("LiveKit egress storage errors", () => {
  it("explains malformed Backblaze S3 access key IDs without exposing provider details", () => {
    const result = normalizeEgressStorageError(
      "S3 upload failed: InvalidAccessKeyId: Malformed Access Key Id"
    );
    assert.match(result, /standard S3-compatible Application Key ID and Application Key/);
    assert.match(result, /not the master key/);
    assert.doesNotMatch(result, /S3 upload failed/);
  });

  it("explains signature mismatch separately from invalid key IDs", () => {
    const result = normalizeEgressStorageError("SignatureDoesNotMatch");
    assert.match(result, /Application Key matches its Application Key ID/);
  });

  it("explains missing bucket write permission", () => {
    const result = normalizeEgressStorageError("AccessDenied");
    assert.match(result, /writeFiles access/);
  });

  it("keeps unknown errors bounded", () => {
    const result = normalizeEgressStorageError("x".repeat(1000));
    assert.equal(result.length, 500);
  });
});
