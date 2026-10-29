import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planAgentTask, shouldRouteToAgent } from "./plan.ts";

describe("Jimvio AI acts without a mode switch", () => {
  it("creates a named free community right away", () => {
    const plan = planAgentTask('create a community called "Kigali Traders"');
    assert.equal(plan?.steps[0]?.tool, "community.create");
    assert.equal(plan?.steps[0]?.needsConfirmation, false);
  });
  it("answers how-to questions in chat instead of acting", () => {
    assert.equal(planAgentTask("how do I create a community called Kigali Traders?"), null);
    assert.equal(shouldRouteToAgent("how to change my bio"), false);
  });
  it("searches communities", () => {
    const plan = planAgentTask("find communities about trading");
    assert.equal(plan?.steps[0]?.tool, "community.search");
    assert.equal(plan?.steps[0]?.input.query, "trading");
  });
  it("updates profile name and bio", () => {
    const plan = planAgentTask('change my name to "Aline Mukamana"');
    assert.equal(plan?.steps[0]?.tool, "profile.update");
    assert.equal(plan?.steps[0]?.input.fullName, "Aline Mukamana");
    const bio = planAgentTask("set my bio to Fashion creator in Kigali");
    assert.equal(bio?.steps[0]?.input.bio, "Fashion creator in Kigali");
  });
  it("asks for the value when a profile change is incomplete", () => {
    const plan = planAgentTask("update my profile");
    assert.equal(plan?.steps.length, 0);
    assert.ok(plan?.missing);
  });
  it("creates a post with quoted text in a named community", () => {
    const plan = planAgentTask('create a post in P7 PROVIDER "Live session tonight at 8pm"');
    assert.equal(plan?.steps[0]?.tool, "post.create");
    assert.equal(plan?.steps[0]?.input.body, "Live session tonight at 8pm");
    assert.equal(plan?.steps[0]?.input.community, "P7 PROVIDER");
  });
  it("still never moves money", () => {
    const plan = planAgentTask("withdraw my balance to mobile money");
    assert.equal(plan?.classification, "refuse");
  });
});
