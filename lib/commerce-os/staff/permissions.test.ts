import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Pure role matrix (mirrors staff/permissions.ts ROLE_PERMS — keep in sync)
const ROLE_PERMS: Record<string, string[]> = {
  owner: ["*"],
  admin: [
    "products",
    "orders",
    "customers",
    "analytics",
    "marketing",
    "payments",
    "shipping",
    "fulfillment",
    "settings",
  ],
  manager: ["products", "orders", "customers", "analytics", "shipping", "fulfillment"],
  support: ["orders", "customers"],
  fulfillment: ["orders", "fulfillment", "shipping"],
  marketing: ["products", "marketing", "analytics", "customers"],
  analyst: ["analytics"],
};

function roleAllows(role: string, permission: string): boolean {
  const perms = ROLE_PERMS[role];
  if (!perms) return false;
  return perms.includes("*") || perms.includes(permission);
}

describe("store staff permissions", () => {
  it("owner can do everything", () => {
    assert.equal(roleAllows("owner", "payments"), true);
    assert.equal(roleAllows("owner", "settings"), true);
  });

  it("support cannot change payments", () => {
    assert.equal(roleAllows("support", "orders"), true);
    assert.equal(roleAllows("support", "payments"), false);
  });

  it("analyst is read analytics only", () => {
    assert.equal(roleAllows("analyst", "analytics"), true);
    assert.equal(roleAllows("analyst", "products"), false);
  });
});
