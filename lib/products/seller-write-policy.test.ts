import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const sql = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../database/migrations/167_course_privacy_wallet_seller_rls.sql"),
  "utf8"
);

describe("seller product write RLS", () => {
  it("gates authenticated inserts on vendor identity and verification, not a client source flag", () => {
    assert.match(sql, /CREATE POLICY products_insert/);
    assert.match(sql, /vendor_may_write_product\(vendor_id, product_type\)/);
    assert.doesNotMatch(sql.slice(sql.indexOf("CREATE POLICY products_insert")), /source\s*=/);
  });

  it("blocks unverified physical writes and suspended vendors", () => {
    assert.match(sql, /suspended/);
    assert.match(sql, /p_product_type IS DISTINCT FROM 'physical'::product_type/);
    assert.match(sql, /verification_status = 'verified'::verification_status/);
  });

  it("keeps increment_wallet_balance untouched", () => {
    assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.increment_wallet_balance/);
    assert.match(sql, /debit_wallet_if_sufficient is restricted to service_role/);
  });
});
