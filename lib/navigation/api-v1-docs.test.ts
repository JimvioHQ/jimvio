import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { API_V1_DOCS } from "./api-v1-docs";

function routeFile(path: string) {
  const relative = path.replace(/^\/api\/v1\//, "").replace(":id", "[id]");
  return join(process.cwd(), "app/api/v1", relative, "route.ts");
}

describe("public API v1 docs", () => {
  it("matches a real route file, method, and scope", () => {
    assert.ok(API_V1_DOCS.length > 0);
    for (const endpoint of API_V1_DOCS) {
      const file = routeFile(endpoint.path);
      assert.equal(existsSync(file), true, endpoint.path);
      const source = readFileSync(file, "utf8");
      assert.match(source, new RegExp(`export async function ${endpoint.method}\\b`));
      assert.match(source, new RegExp(endpoint.scope.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.equal(/secret|password|service_role|apikey/i.test(endpoint.summary), false);
    }
  });
});
