import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCommerceOverviewDashboard } from "./dashboard.ts";

describe("commerce overview dashboard", () => {
  it("starts independent store reads together and keeps empty results", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const started: string[] = [];

    function query(table: string, result: { data: unknown; error: null; count?: number | null }) {
      const run = () => {
        started.push(table);
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return Promise.resolve().then(() => {
          inFlight -= 1;
          return result;
        });
      };
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const method of ["select", "eq", "gte", "order", "limit", "not", "in", "is"]) {
        builder[method] = chain;
      }
      builder.maybeSingle = run;
      builder.then = (
        onfulfilled?: ((value: unknown) => unknown) | null,
        onrejected?: ((reason: unknown) => unknown) | null,
      ) => run().then(onfulfilled, onrejected);
      return builder;
    }

    const db = {
      from(table: string) {
        if (table === "orders") {
          return query(table, { data: [], error: null, count: 0 });
        }
        if (table === "jimvio_stores") {
          return query(table, {
            data: {
              status: "draft",
              published_theme: null,
              theme_id: null,
              settings: {},
              primary_domain: null,
            },
            error: null,
          });
        }
        return query(table, { data: [], error: null, count: 0 });
      },
    };

    const dash = await getCommerceOverviewDashboard(
      db as unknown as SupabaseClient,
      "store-1",
      "vendor-1",
      "northwind",
      30,
    );

    assert.ok(maxInFlight >= 8);
    assert.deepEqual(dash.recentOrders, []);
    assert.equal(dash.analytics.customers, 0);
    assert.equal(dash.analytics.productsPublished, 0);
    assert.equal(dash.storeLive, false);
    assert.equal(dash.topProducts.length, 0);
    assert.equal(dash.checklist.find((item) => item.id === "products")?.done, false);
    assert.equal(dash.checklist.find((item) => item.id === "payments")?.done, false);
    assert.ok(started.includes("orders"));
    assert.ok(started.includes("jimvio_store_products"));
  });
});
