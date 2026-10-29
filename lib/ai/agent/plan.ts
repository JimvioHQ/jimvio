/**
 * Deterministic Jimvio AI task planner.
 * The model may ask for an action. Only these planned steps can run.
 */

export type AgentMode = "assist" | "agent";

export type AgentScope = "communities" | "stores" | "reads";

export type AgentToolName =
  | "account.summary"
  | "account.activity"
  | "community.create"
  | "community.configure"
  | "community.channels"
  | "store.create"
  | "orders.summary"
  | "wallet.summary"
  | "product.draft"
  | "finance.refuse"
  | "community.search"
  | "profile.update"
  | "post.create";

export const AGENT_TOOL_NAMES = [
  "account.summary",
  "account.activity",
  "community.create",
  "community.configure",
  "community.channels",
  "store.create",
  "orders.summary",
  "wallet.summary",
  "product.draft",
  "finance.refuse",
  "community.search",
  "profile.update",
  "post.create",
] as const satisfies readonly AgentToolName[];

export function isAgentToolName(value: string): value is AgentToolName {
  return (AGENT_TOOL_NAMES as readonly string[]).includes(value);
}

export type AgentStep = {
  tool: AgentToolName;
  input: Record<string, string | number | boolean | string[]>;
  needsConfirmation: boolean;
};

export type AgentPlan = {
  classification: "inspect" | "draft" | "execute" | "refuse";
  steps: AgentStep[];
  summary: string;
  missing?: string;
};

const INJECTION =
  /ignore (all |any |previous |the )?instructions|system prompt|you are now|service[-_ ]?role|grant yourself admin/i;

const FINANCE_MUTATION =
  /\b(withdraw|payout|pay out|refund|transfer funds|send money|spend|buy now|purchase|change billing)\b/i;

const COMMUNITY_INTENT =
  /\b(create|start|set up|setup|build|launch)\b[\s\S]{0,80}\bcommunity\b/i;

const STORE_INTENT = /\b(create|start|set up|setup|open)\b[\s\S]{0,40}\bstore\b/i;

const SEARCH_INTENT =
  /\b(find|search|look for|show me|discover|recommend|suggest)\b[\s\S]{0,60}\bcommunit(?:y|ies)\b/i;

const PROFILE_INTENT =
  /\b(change|update|set|edit|rename)\b[\s\S]{0,30}\b(?:my\s+)?(?:profile|display name|full name|name|bio|about)\b/i;

const POST_INTENT =
  /\b(?:create|write|publish|make|share)\s+(?:a\s+|an\s+|this\s+)?post\b|\bpost\s+(?:this|that|["“'])/i;

/** "How do I …" questions are answered in chat, never executed. */
const HOW_TO = /^\s*(how (?:do|can|would|should) (?:i|we|you)|how to|can i|could i|what(?:'s| is) the way to)\b/i;

const ACCOUNT_READ =
  /\b(my orders|order status|my balance|wallet balance|my wallet|wallet|my communities|my stores|setup step|incomplete|action history|recent changes|did the community|what did we finish)\b/i;

export function looksLikeAgentTask(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  const injected = INJECTION.test(text) && !COMMUNITY_INTENT.test(text) && !STORE_INTENT.test(text);
  if (injected) return FINANCE_MUTATION.test(text) || ACCOUNT_READ.test(text);
  if (HOW_TO.test(text) && !SEARCH_INTENT.test(text)) return FINANCE_MUTATION.test(text);
  return (
    SEARCH_INTENT.test(text) ||
    PROFILE_INTENT.test(text) ||
    POST_INTENT.test(text) ||
    COMMUNITY_INTENT.test(text) ||
    STORE_INTENT.test(text) ||
    FINANCE_MUTATION.test(text) ||
    ACCOUNT_READ.test(text) ||
    (/\bdraft\b/i.test(text) && /\bproduct\b/i.test(text))
  );
}

/** True when the server-side planner will handle the message. Affiliate chat stays on its current path. */
export function shouldRouteToAgent(message: string): boolean {
  if (
    /\baffiliate\b/i.test(message) &&
    !FINANCE_MUTATION.test(message) &&
    !COMMUNITY_INTENT.test(message) &&
    !STORE_INTENT.test(message)
  ) {
    return false;
  }
  return planAgentTask(message) !== null;
}

export function normalizeAgentPreference(input: unknown): { mode: AgentMode; scopes: AgentScope[] } {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const mode = record.mode === "agent" ? "agent" : "assist";
  const raw = Array.isArray(record.scopes) ? record.scopes : [];
  const scopes = raw.filter(
    (item): item is AgentScope => item === "communities" || item === "stores" || item === "reads",
  );
  return { mode, scopes: [...new Set(scopes)] };
}

function clean(value: string, max: number) {
  return value.replace(/[\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function quotedName(message: string, label: RegExp): string | null {
  const match = message.match(label);
  if (!match?.[1]) return null;
  const name = clean(match[1].replace(/[.?!]+$/, ""), 80);
  if (name.length < 2 || INJECTION.test(name)) return null;
  return name;
}

function communityName(message: string) {
  return (
    quotedName(message, /\b(?:called|named|name is|name:)\s+["“']?([^"“”'\n,]{2,80})/i) ||
    quotedName(message, /\bcommunity\s+["“']([^"“”']{2,80})["”']/i)
  );
}

function fieldAfter(message: string, label: string, max: number) {
  const match = message.match(new RegExp(`\\b${label}\\s*[:=]\\s*([^\\n.]{2,${max}})`, "i"));
  if (!match?.[1]) return "";
  const value = clean(match[1].split(",")[0] ?? "", max);
  return INJECTION.test(value) ? "" : value;
}

function descriptionFor(message: string, name: string) {
  const explicit = fieldAfter(message, "description", 400);
  if (explicit) return explicit;
  if (/\b(suitable|short|default) description\b/i.test(message)) return `${name} on Jimvio.`;
  return "";
}

function channelNames(message: string): string[] {
  const listed = message.match(/\bchannels?\s*(?::|named|called)\s*([^\n.]+)/i);
  if (listed?.[1] && !/\bthree\b|\b3\b/i.test(listed[1])) {
    return listed[1]
      .split(/,| and /i)
      .map((item) => clean(item, 40))
      .filter((item) => item.length >= 2 && !INJECTION.test(item))
      .slice(0, 3);
  }
  if (/\b(three|3)\s+channels?\b|\bchannels?\b/i.test(message)) {
    return ["Introductions", "Announcements", "Discussion"];
  }
  return [];
}

/**
 * Jimvio AI acts on explicit, complete requests right away (no mode switch).
 * Money never moves (finance requests are refused above); everything it can
 * change is the member's own and can be edited or archived afterwards.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function confirmation(_tool: AgentToolName, _mode: AgentMode, _scopes: AgentScope[]) {
  return false;
}

function profileFields(text: string): { fullName?: string; bio?: string } {
  const name =
    quotedName(text, /\b(?:display name|full name|my name|name)\s+(?:to|as|:|=|is)\s+["“']?([^"“”'\n]{2,60})/i) ||
    quotedName(text, /\brename\s+(?:me|my profile|myself)\s+(?:to\s+)?["“']?([^"“”'\n]{2,60})/i);
  const bioMatch = text.match(/\b(?:bio|about|description)\s+(?:to|as|:|=|is)\s+["“']?([^"“”\n]{2,300})/i);
  const bio = bioMatch?.[1] ? clean(bioMatch[1].replace(/["”']+$/, ""), 300) : "";
  return {
    ...(name ? { fullName: name } : {}),
    ...(bio && !INJECTION.test(bio) ? { bio } : {}),
  };
}

function postBody(text: string): string {
  const quoted = text.match(/["“]([^"”]{2,2000})["”]/);
  if (quoted?.[1]) return clean(quoted[1], 2000);
  const after = text.match(/\b(?:saying|that says|with the text|text|content|post)\s*[:\-]\s*([\s\S]{2,2000})$/i);
  if (after?.[1]) return clean(after[1], 2000);
  return "";
}

function postCommunity(text: string): string {
  // Look only outside the quoted post text.
  const outside = text.replace(/["“][^"”]*["”]/g, " ").replace(/\s+/g, " ").trim();
  const m = outside.match(/\b(?:in|to|on|into)\s+(?:the\s+)?(?:community\s+)?([A-Za-z0-9][^:,.\n]{0,60}?)(?:\s+community)?\s*(?:[:,.]|\bsaying\b|\bthat\b|\bwith\b|$)/i);
  const name = m?.[1] ? clean(m[1], 60) : "";
  return name && !/^(my|the)?\s*(feed|profile|wall)$/i.test(name) && !INJECTION.test(name) ? name : "";
}

function searchQuery(text: string): string {
  const m = text.match(/\bcommunit(?:y|ies)\s+(?:about|for|on|in|related to|around)\s+([^\n?.]{2,60})/i)
    || text.match(/\b(?:find|search|look for|show me|discover|recommend|suggest)\s+(?:me\s+)?(?:some\s+|a\s+)?([^\n?.]{2,40}?)\s+communit/i);
  const q = m?.[1] ? clean(m[1], 60) : "";
  return /^(the|a|some|good|best|top|new)$/i.test(q) ? "" : q;
}

export function planAgentTask(
  message: string,
  options: { mode?: AgentMode; scopes?: AgentScope[] } = {},
): AgentPlan | null {
  const mode = options.mode === "agent" ? "agent" : "assist";
  const scopes = options.scopes ?? [];
  const original = message.trim();
  if (!original) return null;
  if (!looksLikeAgentTask(original) && !INJECTION.test(original)) return null;

  if (INJECTION.test(original) && !COMMUNITY_INTENT.test(original) && !STORE_INTENT.test(original)) {
    return {
      classification: "refuse",
      steps: [],
      summary: "That request tries to change Jimvio AI instructions. No action was run.",
    };
  }

  const text = original.replace(INJECTION, " ").trim();

  if (FINANCE_MUTATION.test(text)) {
    return {
      classification: "refuse",
      steps: [
        {
          tool: "finance.refuse",
          input: { reason: "financial_mutation" },
          needsConfirmation: false,
        },
      ],
      summary:
        "Payments, payouts, refunds, and transfers stay in the existing checkout and wallet screens. Jimvio AI will not move money.",
    };
  }

  if (/\bdraft\b/i.test(text) && /\bproduct\b/i.test(text)) {
    const name = communityName(text) || fieldAfter(text, "product", 80) || "this product";
    return {
      classification: "draft",
      steps: [
        {
          tool: "product.draft",
          input: { name: clean(name, 80) },
          needsConfirmation: false,
        },
      ],
      summary: "This drafts listing copy only. It does not create or publish a product.",
    };
  }

  if (SEARCH_INTENT.test(text) && !COMMUNITY_INTENT.test(text)) {
    return {
      classification: "inspect",
      steps: [{ tool: "community.search", input: { query: searchQuery(text) }, needsConfirmation: false }],
      summary: "Public communities on Jimvio that match.",
    };
  }

  if (PROFILE_INTENT.test(text) && !COMMUNITY_INTENT.test(text) && !STORE_INTENT.test(text)) {
    const fields = profileFields(text);
    if (!fields.fullName && !fields.bio) {
      return {
        classification: "execute",
        steps: [],
        missing: "new profile name or bio",
        summary:
          'Tell me the new value, e.g. "change my name to Aline M." or "set my bio to Fashion creator in Kigali". Photos are changed on your profile page.',
      };
    }
    return {
      classification: "execute",
      steps: [{ tool: "profile.update", input: fields, needsConfirmation: false }],
      summary: "Updating your profile.",
    };
  }

  if (POST_INTENT.test(text) && !COMMUNITY_INTENT.test(text)) {
    const body = postBody(text);
    if (!body) {
      return {
        classification: "execute",
        steps: [],
        missing: "post text",
        summary: 'Put the post text in quotes, e.g. create a post in P7 PROVIDER "Live session tonight at 8pm".',
      };
    }
    const community = postCommunity(text);
    return {
      classification: "execute",
      steps: [
        {
          tool: "post.create",
          input: { body, ...(community ? { community } : {}) },
          needsConfirmation: false,
        },
      ],
      summary: "Publishing your post.",
    };
  }

  if (ACCOUNT_READ.test(text)) {
    const steps: AgentStep[] = [];
    if (/\b(my communities|my stores|setup step|incomplete|account)\b/i.test(text)) {
      steps.push({ tool: "account.summary", input: {}, needsConfirmation: false });
    }
    if (/\b(action history|recent changes|did the community|what did we finish)\b/i.test(text)) {
      steps.push({ tool: "account.activity", input: {}, needsConfirmation: false });
    }
    if (/\b(my orders|order status)\b/i.test(text)) {
      steps.push({ tool: "orders.summary", input: {}, needsConfirmation: false });
    }
    if (/\b(my balance|wallet balance|my wallet|wallet)\b/i.test(text)) {
      steps.push({ tool: "wallet.summary", input: {}, needsConfirmation: false });
    }
    if (!steps.length) {
      steps.push({ tool: "account.summary", input: {}, needsConfirmation: false });
    }
    return {
      classification: "inspect",
      steps: steps.slice(0, 4),
      summary: "These are read-only checks for the signed-in account.",
    };
  }

  if (/\b(paid|private|charge)\b/i.test(text) && COMMUNITY_INTENT.test(text)) {
    return {
      classification: "refuse",
      steps: [],
      summary:
        "Paid and private communities are set up in the create form (/communities/create) so you choose the price and access. Nothing was created yet.",
    };
  }

  const steps: AgentStep[] = [];
  if (COMMUNITY_INTENT.test(text)) {
    const name = communityName(text);
    if (!name) {
      return {
        classification: "execute",
        steps: [],
        missing: "community name",
        summary: "A community name is required before Jimvio AI can create one.",
      };
    }
    const description = descriptionFor(text, name);
    const rules = fieldAfter(text, "rules", 400);
    const category = fieldAfter(text, "category", 40);
    steps.push({
      tool: "community.create",
      input: {
        name,
        ...(description ? { description } : {}),
      },
      needsConfirmation: confirmation("community.create", mode, scopes),
    });
    if (rules || category) {
      steps.push({
        tool: "community.configure",
        input: {
          ...(description ? { description } : {}),
          ...(rules ? { rules } : {}),
          ...(category ? { category } : {}),
        },
        needsConfirmation: confirmation("community.configure", mode, scopes),
      });
    }
    const channels = channelNames(text);
    if (channels.length) {
      steps.push({
        tool: "community.channels",
        input: { channels },
        needsConfirmation: confirmation("community.channels", mode, scopes),
      });
    }
  }

  if (STORE_INTENT.test(text)) {
    const name =
      quotedName(text, /\bstore\s+(?:called|named)\s+["“']?([^"“”'\n,]{2,80})/i) ||
      quotedName(text, /\b(?:called|named)\s+["“']?([^"“”'\n,]{2,80})/i);
    if (!name) {
      return {
        classification: "execute",
        steps,
        missing: "store name",
        summary: "A store name is required before Jimvio AI can create one.",
      };
    }
    steps.push({
      tool: "store.create",
      input: { name },
      needsConfirmation: true,
    });
  }

  if (!steps.length) return null;
  const needsConfirmation = steps.some((step) => step.needsConfirmation);
  let summary = needsConfirmation
    ? "Review this plan. Nothing is saved until you confirm."
    : "Done — here is what Jimvio AI did.";
  if (/\brules\b/i.test(text) && !steps.some((step) => step.tool === "community.configure" && step.input.rules)) {
    summary += " Rules were not included, so none were saved.";
  }
  return {
    classification: "execute",
    steps: steps.slice(0, 6),
    summary,
  };
}

export function redactAgentText(value: string) {
  return value
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[redacted]")
    .replace(/service[_ -]?role|supabase_service_role|eyJ[A-Za-z0-9_-]{20,}/gi, "[redacted]")
    .slice(0, 280);
}
