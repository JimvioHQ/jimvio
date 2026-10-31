import test from "node:test";
import assert from "node:assert/strict";
import { validateMcpTokenClaims } from "./mcp-token";

const resource = "https://www.jimvio.com/api/mcp";
const issuer = "https://vsfhwfimudpdipdkxbww.supabase.co/auth/v1";
const base = { iss: issuer, aud: resource, client_id: "a-client-id", exp: Math.floor(Date.now() / 1000) + 300 };

test("accepts a valid resource-bound OAuth token claim set", () => {
  assert.equal(validateMcpTokenClaims(base, resource, issuer), null);
});

test("rejects a token with only the generic Supabase audience", () => {
  assert.match(validateMcpTokenClaims({ ...base, aud: "authenticated" }, resource, issuer) ?? "", /not bound/);
});

test("rejects an audience for a different MCP resource", () => {
  assert.match(validateMcpTokenClaims({ ...base, aud: "https://other.example/mcp" }, resource, issuer) ?? "", /not bound/);
});

test("accepts an audience array containing the exact resource", () => {
  assert.equal(validateMcpTokenClaims({ ...base, aud: [resource] }, resource, issuer), null);
});

test("rejects a token from an unexpected issuer", () => {
  assert.match(validateMcpTokenClaims({ ...base, iss: "https://attacker.example" }, resource, issuer) ?? "", /unexpected authority/);
});

test("rejects a token without an OAuth client id", () => {
  const claims = { ...base };
  delete (claims as Record<string, unknown>).client_id;
  assert.match(validateMcpTokenClaims(claims, resource, issuer) ?? "", /client identifier/);
});

test("rejects expired tokens", () => {
  assert.match(validateMcpTokenClaims({ ...base, exp: 1 }, resource, issuer) ?? "", /expired/);
});
