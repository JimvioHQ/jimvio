import {
  isAgentToolName,
  planAgentTask,
  redactAgentText,
  type AgentMode,
  type AgentScope,
  type AgentStep,
} from "./plan";

export type AgentLink = { label: string; href: string };

export type AgentStepResult = {
  tool: string;
  status: "completed" | "failed" | "skipped";
  summary: string;
  href?: string;
  resourceId?: string;
};

export type StoredAgentExecution = {
  id: string;
  userId: string;
  status: "awaiting_confirmation" | "running" | "completed" | "partial" | "failed" | "cancelled";
  summary: string;
  steps: AgentStep[];
  results: AgentStepResult[];
  retryCount: number;
  confirmation: "pending" | "granted" | "not_required" | "cancelled";
  communityId?: string;
  communitySlug?: string;
  communityName?: string;
};

export type AgentPorts = {
  userId: string;
  mode: AgentMode;
  scopes: AgentScope[];
  loadExecution: (id: string) => Promise<StoredAgentExecution | null>;
  saveExecution: (record: StoredAgentExecution) => Promise<void>;
  createCommunity: (input: { name: string; description?: string }) => Promise<
    | { ok: true; id: string; slug: string; name: string; reused: boolean; workspaceReady?: boolean }
    | { ok: false; error: string; status: number }
  >;
  configureCommunity: (input: {
    communityId: string;
    description?: string;
    rules?: string;
    category?: string;
  }) => Promise<{ ok: true } | { ok: false; error: string; status: number }>;
  addChannels: (input: {
    communityId: string;
    channels: string[];
  }) => Promise<{ ok: true; channels: string[] } | { ok: false; error: string; status: number }>;
  createStore: (input: { name: string }) => Promise<
    | { ok: true; handle: string; url: string; reused?: boolean }
    | { ok: false; error: string; status: number }
  >;
  readAccount: () => Promise<{
    communities: string[] | null;
    stores: string[] | null;
    setupGaps: string[];
  }>;
  readActivity: () => Promise<{ items: string[] } | { unavailable: string }>;
  readOrders: () => Promise<{ items: string[] } | { unavailable: string }>;
  readWallet: () => Promise<{ summary: string } | { unavailable: string }>;
  searchCommunities: (query: string) => Promise<
    { items: Array<{ name: string; slug: string; members: number; tagline: string | null }> } | { unavailable: string }
  >;
  updateProfile: (input: { fullName?: string; bio?: string }) => Promise<
    { ok: true; username: string | null } | { ok: false; error: string; status: number }
  >;
  createPost: (input: { body: string; community?: string }) => Promise<
    { ok: true; communityName: string; href: string } | { ok: false; error: string; status: number }
  >;
};

export type AgentRunResult = {
  handled: true;
  status: StoredAgentExecution["status"] | "needs_input" | "refused";
  content: string;
  links: AgentLink[];
  executionId?: string;
  steps: AgentStepResult[];
};

export function agentExecutionIdForUser(value: unknown, userId: string): string | null {
  if (typeof value !== "string" || !userId) return null;
  const id = value.trim();
  if (!id.startsWith(`ai:${userId}:`) || id.length > 180) return null;
  return id;
}

function executionIdFor(userId: string, steps: AgentStep[]) {
  const target = steps
    .map((step) => `${step.tool}:${String(step.input.name || step.input.channels || "")}`)
    .join("|")
    .toLowerCase()
    .replace(/[^a-z0-9|:]+/g, "-")
    .slice(0, 80);
  return `ai:${userId}:${target || "read"}`;
}

function linesFrom(results: AgentStepResult[], label: string) {
  const matching = results.filter((item) => item.status === label);
  if (!matching.length) return "";
  return `${label[0]?.toUpperCase()}${label.slice(1)}\n${matching.map((item) => `- ${item.summary}`).join("\n")}`;
}

export async function runAgentPlan(input: {
  message?: string;
  confirm?: boolean;
  cancel?: boolean;
  executionId?: string;
  ports: AgentPorts;
}): Promise<AgentRunResult | { handled: false }> {
  if (!input.ports.userId) {
    return {
      handled: true,
      status: "failed",
      content: "Sign in before Jimvio AI can use your account.",
      links: [{ label: "Sign in", href: "/login?next=/ai" }],
      steps: [],
    };
  }

  const stored = input.executionId ? await input.ports.loadExecution(input.executionId) : null;
  if (stored && stored.userId !== input.ports.userId) {
    return {
      handled: true,
      status: "refused",
      content: "That action belongs to a different account.",
      links: [],
      steps: [],
    };
  }

  if (input.cancel) {
    if (!stored) {
      return {
        handled: true,
        status: "refused",
        content: "There is no pending action to cancel.",
        links: [],
        steps: [],
      };
    }
    stored.status = "cancelled";
    stored.confirmation = "cancelled";
    await input.ports.saveExecution(stored);
    return {
      handled: true,
      status: "cancelled",
      executionId: stored.id,
      content: "Cancelled. Completed steps were kept, and nothing else was changed.",
      links: linksFrom(stored),
      steps: stored.results,
    };
  }

  if (stored?.status === "completed") {
    return {
      handled: true,
      status: "completed",
      executionId: stored.id,
      content: reportContent(stored.results, "completed"),
      links: linksFrom(stored),
      steps: stored.results,
    };
  }

  let planSteps = stored?.steps;
  let summary = stored?.summary ?? "";
  if (!planSteps) {
    if (input.executionId) {
      return {
        handled: true,
        status: "refused",
        content: "That action is no longer available on this account.",
        links: [],
        steps: [],
      };
    }
    const planned = planAgentTask(input.message ?? "", {
      mode: input.ports.mode,
      scopes: input.ports.scopes,
    });
    if (!planned) return { handled: false };
    if (planned.missing) {
      return {
        handled: true,
        status: "needs_input",
        content: planned.summary,
        links:
          planned.missing === "community name"
            ? [{ label: "Create a community", href: "/communities/create" }]
            : [{ label: "Commerce stores", href: "/commerce/stores" }],
        steps: [],
      };
    }
    if (!planned.steps.length) {
      return {
        handled: true,
        status: "refused",
        content: planned.summary,
        links: planned.summary.includes("form")
          ? [{ label: "Create a community", href: "/communities/create" }]
          : [],
        steps: [],
      };
    }
    planSteps = planned.steps;
    summary = planned.summary;
  }

  const id = stored?.id ?? executionIdFor(input.ports.userId, planSteps);
  const record: StoredAgentExecution = stored ?? {
    id,
    userId: input.ports.userId,
    status: "running",
    summary,
    steps: planSteps,
    results: [],
    retryCount: 0,
    confirmation: "not_required",
  };
  record.steps = record.steps.filter((step) => isAgentToolName(step.tool)).slice(0, 6);
  if (!record.steps.length) {
    record.status = "failed";
    await input.ports.saveExecution(record);
    return {
      handled: true,
      status: "failed",
      executionId: record.id,
      content: "That action is not available from Jimvio AI.",
      links: [],
      steps: [],
    };
  }

  const needsConfirmation = record.steps.some((step) => step.needsConfirmation);
  const resuming = Boolean(
    stored &&
      (stored.status === "partial" || stored.status === "failed") &&
      (stored.confirmation === "granted" || stored.confirmation === "not_required"),
  );
  const confirmedNow = input.confirm === true && stored?.status === "awaiting_confirmation";
  if (needsConfirmation && !confirmedNow && !resuming) {
    record.status = "awaiting_confirmation";
    record.confirmation = "pending";
    await input.ports.saveExecution(record);
    const preview = record.steps.map((step) => `- ${step.tool.replaceAll(".", " ")}`).join("\n");
    const storeNotice = record.steps.some((step) => step.tool === "store.create")
      ? "\n\nA new store is publicly reachable as soon as it is created. Confirm only if this store should go live."
      : "";
    return {
      handled: true,
      status: "awaiting_confirmation",
      executionId: record.id,
      content: `${record.summary}\n\n${preview}\n\nConfirm to run this plan. Nothing has been changed yet.${storeNotice}`,
      links: [],
      steps: [],
    };
  }

  if (resuming) record.retryCount = (record.retryCount ?? 0) + 1;
  record.confirmation = needsConfirmation ? "granted" : record.confirmation || "not_required";
  record.status = "running";
  await input.ports.saveExecution(record);
  const started = Date.now();
  let communityId = record.communityId;
  let communitySlug = record.communitySlug;
  let communityName = record.communityName;

  for (const step of record.steps) {
    if (record.results.some((item) => item.tool === step.tool && item.status === "completed")) continue;
    if (Date.now() - started > 20_000) {
      record.results.push({
        tool: step.tool,
        status: "failed",
        summary: "The action stopped because it took too long.",
      });
      break;
    }
    try {
      const result = await runStep(step, input.ports, {
        communityId,
        communitySlug,
        communityName,
      });
      record.results = record.results.filter((item) => item.tool !== step.tool).concat(result.result);
      if (result.communityId) communityId = result.communityId;
      if (result.communitySlug) communitySlug = result.communitySlug;
      if (result.communityName) communityName = result.communityName;
      if (result.result.status === "failed") break;
    } catch (error) {
      record.results = record.results.filter((item) => item.tool !== step.tool).concat({
        tool: step.tool,
        status: "failed",
        summary: redactAgentText(error instanceof Error ? error.message : "The step failed."),
      });
      break;
    }
  }

  record.communityId = communityId;
  record.communitySlug = communitySlug;
  record.communityName = communityName;
  const failed = record.results.some((item) => item.status === "failed");
  const completed = record.results.some((item) => item.status === "completed");
  record.status = failed && completed ? "partial" : failed ? "failed" : "completed";
  await input.ports.saveExecution(record);

  return {
    handled: true,
    status: record.status,
    executionId: record.id,
    content: reportContent(record.results, record.status),
    links: linksFrom(record),
    steps: record.results,
  };
}

function reportContent(results: AgentStepResult[], status: StoredAgentExecution["status"]) {
  const content = [linesFrom(results, "completed"), linesFrom(results, "failed")].filter(Boolean).join("\n\n");
  return content || (status === "completed" ? "Finished. No extra changes were required." : "The action did not finish.");
}

function linksFrom(record: Pick<StoredAgentExecution, "results" | "communitySlug">): AgentLink[] {
  const links: AgentLink[] = [];
  const seen = new Set<string>();
  for (const result of record.results) {
    if (!result.href || seen.has(result.href)) continue;
    seen.add(result.href);
    links.push({ label: linkLabel(result.tool), href: result.href });
  }
  if (record.communitySlug) {
    const manage = `/owner/communities/${record.communitySlug}`;
    if (!seen.has(manage)) links.push({ label: "Manage community", href: manage });
  }
  return links;
}

function linkLabel(tool: string) {
  if (tool === "store.create") return "Open store";
  if (tool === "product.draft") return "Upload product";
  if (tool.startsWith("community.")) return "Open community";
  return "Open";
}

async function runStep(
  step: AgentStep,
  ports: AgentPorts,
  current: { communityId?: string; communitySlug?: string; communityName?: string },
): Promise<{
  result: AgentStepResult;
  communityId?: string;
  communitySlug?: string;
  communityName?: string;
}> {
  if (step.tool === "finance.refuse") {
    return {
      result: {
        tool: step.tool,
        status: "completed",
        summary: "No wallet, payout, or payment record was changed.",
      },
    };
  }
  if (step.tool === "product.draft") {
    const name = String(step.input.name || "Product");
    return {
      result: {
        tool: step.tool,
        status: "completed",
        href: "/marketplace/new",
        summary: `Draft only, not saved: ${name} is a Jimvio listing. Add your real price, photos, and delivery terms before publishing.`,
      },
    };
  }
  if (step.tool === "account.summary") {
    const account = await ports.readAccount();
    const communities =
      account.communities === null ? "unavailable" : account.communities.join(", ") || "none";
    const stores = account.stores === null ? "unavailable" : account.stores.join(", ") || "none";
    const gaps = account.setupGaps.length ? ` Still open: ${account.setupGaps.join(" ")}` : " No listed setup gap.";
    return {
      result: {
        tool: step.tool,
        status: "completed",
        summary: `Communities you own: ${communities}. Stores: ${stores}.${gaps}`,
      },
    };
  }
  if (step.tool === "account.activity") {
    const activity = await ports.readActivity();
    if ("unavailable" in activity) {
      return { result: { tool: step.tool, status: "failed", summary: activity.unavailable } };
    }
    return {
      result: {
        tool: step.tool,
        status: "completed",
        summary: activity.items.length
          ? `Recorded Jimvio AI actions: ${activity.items.join(" ")} Other account activity is not included here.`
          : "No Jimvio AI action history is recorded for this account yet. Other activity is not included in this check.",
      },
    };
  }
  if (step.tool === "orders.summary") {
    const orders = await ports.readOrders();
    if ("unavailable" in orders) {
      return { result: { tool: step.tool, status: "failed", summary: orders.unavailable } };
    }
    return {
      result: {
        tool: step.tool,
        status: "completed",
        summary: orders.items.length ? orders.items.join(" ") : "No orders are recorded for this account.",
      },
    };
  }
  if (step.tool === "wallet.summary") {
    const wallet = await ports.readWallet();
    if ("unavailable" in wallet) {
      return { result: { tool: step.tool, status: "failed", summary: wallet.unavailable } };
    }
    return { result: { tool: step.tool, status: "completed", summary: wallet.summary } };
  }
  if (step.tool === "community.search") {
    const query = String(step.input.query || "");
    const found = await ports.searchCommunities(query);
    if ("unavailable" in found) {
      return { result: { tool: step.tool, status: "failed", summary: found.unavailable } };
    }
    if (!found.items.length) {
      return {
        result: {
          tool: step.tool,
          status: "completed",
          href: "/communities/explore",
          summary: query
            ? `No public community matches “${query}” yet. You could create one.`
            : "No public communities are listed yet.",
        },
      };
    }
    const lines = found.items.map(
      (c) => `${c.name} (${c.members} ${c.members === 1 ? "member" : "members"})${c.tagline ? ` — ${c.tagline}` : ""}`,
    );
    return {
      result: {
        tool: step.tool,
        status: "completed",
        href: `/communities/${found.items[0]!.slug}`,
        summary: `${query ? `Communities for “${query}”` : "Communities on Jimvio"}: ${lines.join("; ")}.`,
      },
    };
  }
  if (step.tool === "profile.update") {
    const updated = await ports.updateProfile({
      fullName: typeof step.input.fullName === "string" ? step.input.fullName : undefined,
      bio: typeof step.input.bio === "string" ? step.input.bio : undefined,
    });
    if (!updated.ok) {
      return { result: { tool: step.tool, status: "failed", summary: redactAgentText(updated.error) } };
    }
    const changed = [
      typeof step.input.fullName === "string" ? `name to “${step.input.fullName}”` : "",
      typeof step.input.bio === "string" ? "bio" : "",
    ]
      .filter(Boolean)
      .join(" and ");
    return {
      result: {
        tool: step.tool,
        status: "completed",
        href: updated.username ? `/u/${updated.username}` : "/settings/profile",
        summary: `Updated your ${changed}.`,
      },
    };
  }
  if (step.tool === "post.create") {
    const posted = await ports.createPost({
      body: String(step.input.body || ""),
      community: typeof step.input.community === "string" ? step.input.community : undefined,
    });
    if (!posted.ok) {
      return { result: { tool: step.tool, status: "failed", summary: redactAgentText(posted.error) } };
    }
    return {
      result: {
        tool: step.tool,
        status: "completed",
        href: posted.href,
        summary: `Posted in ${posted.communityName}.`,
      },
    };
  }
  if (step.tool === "community.create") {
    const created = await ports.createCommunity({
      name: String(step.input.name),
      description: typeof step.input.description === "string" ? step.input.description : undefined,
    });
    if (!created.ok) {
      return { result: { tool: step.tool, status: "failed", summary: redactAgentText(created.error) } };
    }
    return {
      communityId: created.id,
      communitySlug: created.slug,
      communityName: created.name,
      result: {
        tool: step.tool,
        status: "completed",
        resourceId: created.id,
        href: `/communities/${created.slug}`,
        summary: [
          created.reused
            ? `Reused your community “${created.name}”.`
            : `Created the free public community “${created.name}”.`,
          created.workspaceReady ? "The default discussion space is present." : "",
        ]
          .filter(Boolean)
          .join(" "),
      },
    };
  }
  if (step.tool === "community.configure") {
    if (!current.communityId) {
      return { result: { tool: step.tool, status: "failed", summary: "There is no community to update." } };
    }
    const updated = await ports.configureCommunity({
      communityId: current.communityId,
      description: typeof step.input.description === "string" ? step.input.description : undefined,
      rules: typeof step.input.rules === "string" ? step.input.rules : undefined,
      category: typeof step.input.category === "string" ? step.input.category : undefined,
    });
    if (!updated.ok) {
      return { result: { tool: step.tool, status: "failed", summary: redactAgentText(updated.error) } };
    }
    return {
      result: {
        tool: step.tool,
        status: "completed",
        href: current.communitySlug ? `/communities/${current.communitySlug}` : undefined,
        summary: `Updated ${current.communityName || "the community"}.`,
      },
    };
  }
  if (step.tool === "community.channels") {
    if (!current.communityId) {
      return { result: { tool: step.tool, status: "failed", summary: "There is no community for these channels." } };
    }
    const channels = Array.isArray(step.input.channels)
      ? step.input.channels.map(String).slice(0, 3)
      : [];
    const added = await ports.addChannels({ communityId: current.communityId, channels });
    if (!added.ok) {
      return { result: { tool: step.tool, status: "failed", summary: redactAgentText(added.error) } };
    }
    return {
      result: {
        tool: step.tool,
        status: "completed",
        href: current.communitySlug ? `/communities/${current.communitySlug}` : undefined,
        summary: `Channels ready: ${added.channels.join(", ") || "none"}.`,
      },
    };
  }
  if (step.tool === "store.create") {
    const created = await ports.createStore({ name: String(step.input.name) });
    if (!created.ok) {
      return { result: { tool: step.tool, status: "failed", summary: redactAgentText(created.error) } };
    }
    return {
      result: {
        tool: step.tool,
        status: "completed",
        href: created.url,
        summary: created.reused
          ? `Reused your store “${String(step.input.name)}”.`
          : `Created the store “${String(step.input.name)}”.`,
      },
    };
  }
  return { result: { tool: step.tool, status: "failed", summary: "That tool is not available." } };
}
