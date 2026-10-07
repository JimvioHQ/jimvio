import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("auth email redirect origin", () => {
  it("resolves origin from request host for merchant/platform isolation", () => {
    const src = read("lib/auth/email-redirect-origin.ts");
    assert.match(src, /resolveAuthEmailOrigin/);
    assert.match(src, /x-forwarded-host/);
    assert.match(src, /resolveMerchantAuthRedirect/);
    assert.match(src, /isSafeInternalPath/);
  });

  it("signUp and resend use resolveAuthEmailOrigin for emailRedirectTo", () => {
    const src = read("lib/auth/actions.ts");
    assert.match(src, /resolveAuthEmailOrigin/);
    assert.match(src, /emailRedirectTo:\s*callbackUrl/);
  });
});
