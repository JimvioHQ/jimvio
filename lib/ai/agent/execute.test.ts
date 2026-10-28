import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runAgentPlan, type AgentPorts, type StoredAgentExecution } from "./execute.ts";

function harness(overrides: Partial<AgentPorts> = {}) {
  const calls = { create: 0, channels: 0, store: 0, wallet: 0, account: 0 };
  const store = new Map<string, StoredAgentExecution>();
  const ports: AgentPorts = {
    userId: "user-1",
    mode: "assist",
    scopes: [],
    loadExecution: async (id) => store.get(id) ?? null,
    saveExecution: async (record) => {
      store.set(record.id, structuredClone(record));
    },
    createCommunity: async (input) => {
      calls.create += 1;
      return { ok: true, id: "community-1", slug: "north", name: input.name, reused: false, workspaceReady: true };
    },
    configureCommunity: async () => ({ ok: true }),
    addChannels: async () => {
      calls.channels += 1;
      return { ok: false, error: "Could not add a channel.", status: 500 };
    },
    createStore: async () => {
      calls.store += 1;
      return { ok: true, handle: "harbor", url: "/s/harbor" };
    },
    readAccount: async () => {
      calls.account += 1;
      return { communities: ["North"], stores: [], setupGaps: ["No store is recorded for this seller account."] };
    },
    readActivity: async () => ({ items: [] }),
    readOrders: async () => ({ items: ["Order 10 is pending."] }),
    readWallet: async () => {
      calls.wallet += 1;
      return { summary: "should not be read for a mutation" };
    },
    ...overrides,
  };
  return { ports, calls, store };
}

describe("jimvio ai execution", () => {
  it("requires sign-in and does not treat a first request as confirmation", async () => {
    const signedOut = harness({ userId: "" });
    const blocked = await runAgentPlan({ message: "Create a community named North", ports: signedOut.ports });
    assert.equal(blocked.handled && blocked.status, "failed");
    assert.equal(signedOut.calls.create, 0);

    const { ports, calls } = harness();
    const preview = await runAgentPlan({
      message: "Create a community named North",
      confirm: true,
      ports,
    });
    assert.equal(preview.handled && preview.status, "awaiting_confirmation");
    assert.match(preview.handled ? preview.content : "", /Nothing has been changed yet/);
    assert.equal(calls.create, 0);
  });

  it("creates once after confirmation and does not create again on replay", async () => {
    const { ports, calls } = harness();
    const preview = await runAgentPlan({ message: "Create a community named North", ports });
    const executionId = preview.handled ? preview.executionId : "";
    const created = await runAgentPlan({ executionId, confirm: true, ports });
    assert.equal(created.handled && created.status, "completed");
    assert.match(created.handled ? created.content : "", /Created the free public community “North”/);
    assert.match(created.handled ? created.content : "", /default discussion space is present/);
    assert.equal(created.handled ? created.links.some((link) => link.href === "/communities/north") : false, true);
    assert.equal(calls.create, 1);

    const replay = await runAgentPlan({ executionId, confirm: true, ports });
    assert.equal(replay.handled && replay.status, "completed");
    assert.equal(calls.create, 1);
  });

  it("runs an allowed community plan without asking again", async () => {
    const { ports, calls } = harness({ mode: "agent", scopes: ["communities"] });
    const result = await runAgentPlan({ message: "Create a community named North", ports });
    assert.equal(result.handled && result.status, "completed");
    assert.equal(calls.create, 1);
  });

  it("keeps a successful community when a later channel step fails, then retries only that step", async () => {
    const { ports, calls, store } = harness({ mode: "agent", scopes: ["communities"] });
    const first = await runAgentPlan({
      message: "Create a community named North and prepare three channels",
      ports,
    });
    assert.equal(first.handled && first.status, "partial");
    assert.equal(calls.create, 1);
    assert.equal(calls.channels, 1);
    const executionId = first.handled ? first.executionId : "";
    assert.equal(store.get(executionId || "")?.confirmation, "not_required");

    ports.addChannels = async () => {
      calls.channels += 1;
      return { ok: true, channels: ["Introductions", "Announcements", "Discussion"] };
    };
    const retried = await runAgentPlan({ executionId, ports });
    assert.equal(retried.handled && retried.status, "completed");
    assert.equal(calls.create, 1);
    assert.equal(calls.channels, 2);
    assert.match(retried.handled ? retried.content : "", /Channels ready/);
  });

  it("refuses another account's execution and a poisoned tool", async () => {
    const { ports, calls, store } = harness();
    const preview = await runAgentPlan({ message: "Create a community named North", ports });
    const executionId = preview.handled ? preview.executionId || "" : "";
    const stored = store.get(executionId);
    assert.ok(stored);
    stored.userId = "user-2";
    const foreign = await runAgentPlan({ executionId, confirm: true, ports });
    assert.equal(foreign.handled && foreign.status, "refused");
    assert.match(foreign.handled ? foreign.content : "", /different account/);
    assert.equal(calls.create, 0);

    const poisoned: StoredAgentExecution = {
      id: "ai:user-1:bad",
      userId: "user-1",
      status: "awaiting_confirmation",
      summary: "bad",
      steps: [{ tool: "sql.execute" as never, input: { query: "drop table profiles" }, needsConfirmation: true }],
      results: [],
      retryCount: 0,
      confirmation: "pending",
    };
    await ports.saveExecution(poisoned);
    const refused = await runAgentPlan({ executionId: poisoned.id, confirm: true, ports });
    assert.equal(refused.handled && refused.status, "failed");
    assert.equal(calls.create, 0);
  });

  it("does not move money, read another user, or echo a secret", async () => {
    const { ports, calls } = harness({ mode: "agent", scopes: ["communities"] });
    const money = await runAgentPlan({ message: "Please withdraw my payout now", ports });
    assert.equal(money.handled && money.status, "completed");
    assert.match(money.handled ? money.content : "", /No wallet, payout, or payment record was changed/);
    assert.equal(calls.wallet, 0);
    assert.equal(calls.create, 0);

    const account = await runAgentPlan({ message: "Show my communities and my stores", ports });
    assert.equal(calls.account, 1);
    assert.match(account.handled ? account.content : "", /Communities you own: North/);
    assert.equal(account.handled ? account.content.includes("user-2") : true, false);

    ports.createCommunity = async () => {
      throw new Error("upstream sk-abcDEF123456 service_role eyJaaaaaaaaaaaaaaaaaaaaaa");
    };
    const secret = await runAgentPlan({ message: "Create a community named Secret", ports });
    assert.match(secret.handled ? secret.content : "", /\[redacted\]/);
    assert.equal((secret.handled ? secret.content : "").includes("sk-abc"), false);
  });

  it("records orders and wallet as reads and keeps the execution on this user", async () => {
    const { ports, store } = harness();
    const orders = await runAgentPlan({ message: "Show my orders", ports });
    assert.match(orders.handled ? orders.content : "", /Order 10 is pending/);
    const wallet = await runAgentPlan({ message: "Show my wallet", ports });
    assert.match(wallet.handled ? wallet.content : "", /should not be read for a mutation/);
    const saved = [...store.values()];
    assert.equal(saved.every((record) => record.userId === "user-1"), true);
    assert.equal(saved.some((record) => record.results.some((result) => result.tool === "orders.summary")), true);
  });
});
