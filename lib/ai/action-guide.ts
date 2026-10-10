import type { ParsedLink } from "@/lib/ai/chat-shared";

const PENDING_KEY = "jimvio_ai_pending_action_v1";

export type PendingCommunityAction = {
  operation: "create_community";
  phase: "need_name" | "need_confirm";
  name?: string;
  description?: string;
};

export type GuideLink = ParsedLink;

export type LocalGuideTurn = {
  content: string;
  links?: GuideLink[];
  followups?: string[];
  pending: PendingCommunityAction | null;
  execute?: {
    operation: "create_community";
    name: string;
    description?: string;
  };
};

const CONFIRM = /^(yes|yep|yeah|confirm|confirmed|create it|go ahead|do it|please create( it)?)\b/i;
const CANCEL = /^(no|nope|cancel|stop|don't|do not)\b/i;

const WORKFLOWS: Array<{
  id: string;
  test: RegExp;
  content: string;
  links: GuideLink[];
  followups: string[];
}> = [
  {
    id: "space",
    test: /\b(create|add|start|set up|setup)\b.{0,40}\b(space|spaces)\b|\bcommunity space\b/i,
    content:
      "A space is created inside a community you already manage. Jimvio AI cannot create a space on its own yet.\n\n1. Open Communities and choose the community you own.\n2. Use that community's space tools to add and name the space.\n3. Save it, then post inside the space when you are ready.\n\nI have not created a space.",
    links: [
      { label: "Your communities", href: "/communities" },
      { label: "Spaces", href: "/communities/spaces" },
      { label: "Create a community", href: "/communities/create" },
    ],
    followups: ["Help me create a community", "How do I post in a space?"],
  },
  {
    id: "store",
    test: /\b(set up|setup|create|open|manage)\b.{0,30}\b(my )?store\b/i,
    content:
      "Store setup uses the commerce store tools. I can walk you there, and I will not mark a store as created from this chat.\n\n1. Sign in.\n2. Open Commerce stores.\n3. Add the store details the form asks for and save.\n\nNothing has been created yet.",
    links: [
      { label: "Commerce stores", href: "/commerce/stores" },
      { label: "Seller products", href: "/seller/products" },
    ],
    followups: ["Help me add a product", "Help me start dropshipping"],
  },
  {
    id: "product",
    test: /\b(add|create|list|upload|edit)\b.{0,30}\bproduct\b|\bimprove (my |this )?product listing\b/i,
    content:
      "Product listings are saved from the product form, not from this chat. I have not added or published a product.\n\n1. Open Upload product for a new listing, or Seller products to edit one you already own.\n2. Enter the title, price, and details yourself.\n3. Publish only when the form confirms it.\n\nIf you tell me the product and who it is for, I can draft the description for you to paste in.",
    links: [
      { label: "Upload product", href: "/marketplace/new" },
      { label: "Seller products", href: "/seller/products" },
    ],
    followups: ["Draft a product description", "Help me start dropshipping"],
  },
  {
    id: "dropship",
    test: /\bdropship/i,
    content:
      "Dropshipping starts in Commerce, where you import a supplier product into your store. I have not imported anything.\n\n1. Open Commerce.\n2. Import a product you want to sell.\n3. Set your price on that listing and watch orders there.",
    links: [
      { label: "Commerce", href: "/commerce" },
      { label: "Marketplace", href: "/marketplace" },
    ],
    followups: ["Help me set up my store", "Find products to sell"],
  },
  {
    id: "post",
    test: /\b(edit|create|write|publish)\b.{0,30}\bpost\b/i,
    content:
      "Posts are written in the post composer. I can draft the words here, and I will not publish a post unless you submit it on that page.\n\n1. Open Create post.\n2. Paste or write the content.\n3. Publish from that page when you are ready.\n\nNothing has been published.",
    links: [{ label: "Create post", href: "/create/post" }],
    followups: ["Draft a community post", "Help me create a community"],
  },
  {
    id: "join-campaign",
    test: /\b(find|join|browse)\b.{0,40}\b(campaign|campaigns|ugc)\b/i,
    content:
      "Joining a campaign happens on the campaign page. I have not applied or joined one.\n\n1. Open UGC campaigns.\n2. Choose a campaign you qualify for.\n3. Apply or join from that page.",
    links: [{ label: "UGC campaigns", href: "/ugc" }],
    followups: ["Help me create a campaign", "What can I sell on Jimvio?"],
  },
  {
    id: "manage-community",
    test: /\b(manage|edit|settings)\b.{0,30}\b(my )?community\b/i,
    content:
      "Community settings are saved in the community you own. I have not changed a community.\n\n1. Open your communities.\n2. Choose the community you manage.\n3. Update it from that community's manage page.",
    links: [
      { label: "Your communities", href: "/communities" },
      { label: "Owner communities", href: "/owner/communities" },
    ],
    followups: ["Help me create a community", "Help me create a space"],
  },
  {
    id: "campaign",
    test: /\b(create|start|launch)\b.{0,30}\b(campaign|ugc)\b/i,
    content:
      "Campaigns are created in the campaign center. Jimvio AI does not create, fund, or publish a campaign.\n\n1. Open the campaign center.\n2. Enter the brief, deliverables, and budget yourself.\n3. Fund and publish only from those pages.",
    links: [
      { label: "Create campaign", href: "/ugc/campaign-center/create" },
      { label: "UGC campaigns", href: "/ugc" },
    ],
    followups: ["Help me find a campaign to join", "Draft a campaign brief"],
  },
  {
    id: "live",
    test: /\b(start|host|schedule|set up|setup|create)\b.{0,40}\b(live|live session)\b|\bgo live\b/i,
    content:
      "Live sessions start from the live hub. I have not started or scheduled a session.\n\n1. Open Live.\n2. Start or schedule the session there.\n3. Mention a product only if that session already supports it.",
    links: [
      { label: "Live", href: "/communities/live" },
      { label: "Communities", href: "/communities" },
    ],
    followups: ["Help me create a community", "What can I do on a live session?"],
  },
  {
    id: "affiliate",
    test: /\baffiliate\b/i,
    content:
      "Affiliate earnings come from a tracked link on a program you join. I will not guess a commission.\n\n1. Open Affiliates.\n2. Choose a product you can recommend.\n3. Use the tracked link from that program and review recorded earnings in the product.",
    links: [
      { label: "Affiliates", href: "/affiliates" },
      { label: "Marketplace", href: "/marketplace" },
    ],
    followups: ["Help me choose a product", "Find trending products"],
  },
  {
    id: "digital",
    test: /\b(digital product|course)\b/i,
    content:
      "Digital products and courses are listings you publish from the product form. I have not created one.\n\n1. Open Upload product.\n2. Add the file or course details and a price.\n3. Publish from that form.",
    links: [
      { label: "Upload product", href: "/marketplace/new" },
      { label: "Courses", href: "/communities/courses" },
    ],
    followups: ["Draft a course description", "Help me add a product"],
  },
  {
    id: "marketing",
    test: /\b(marketing|grow my|growth)\b/i,
    content:
      "I can help you plan marketing, and the actions still happen in the product.\n\n1. Pick one offer: a product, affiliate link, community, or campaign.\n2. Draft the announcement or post here.\n3. Publish it from the matching Jimvio page. I will not publish it for you.",
    links: [
      { label: "Create post", href: "/create/post" },
      { label: "Affiliates", href: "/affiliates" },
      { label: "Campaigns", href: "/ugc" },
    ],
    followups: ["Draft an announcement", "Help me choose a starting point"],
  },
];

function readPending(): PendingCommunityAction | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCommunityAction;
    if (parsed?.operation !== "create_community") return null;
    if (parsed.phase !== "need_name" && parsed.phase !== "need_confirm") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingAction(pending: PendingCommunityAction | null) {
  if (typeof window === "undefined") return;
  try {
    if (!pending) sessionStorage.removeItem(PENDING_KEY);
    else sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // private mode
  }
}

export function loadPendingAction() {
  return readPending();
}

function extractName(message: string): string | null {
  const labeled = message.match(
    /\b(?:called|named|name is|name:)\s+["“']?([^"“”'\n]{2,80})/i,
  );
  if (labeled?.[1]) return labeled[1].replace(/[.?!]+$/, "").trim();
  return null;
}

function communityIntent(message: string) {
  return /\b(create|start|set up|setup|build|launch)\b.{0,40}\bcommunity\b|\bhelp me create a community\b/i.test(
    message,
  );
}

function communityReply(name: string, description?: string): LocalGuideTurn {
  const pending: PendingCommunityAction = {
    operation: "create_community",
    phase: "need_confirm",
    name,
    description,
  };
  return {
    pending,
    content: `I can create a free public community named “${name}”. It will be visible in communities, and it will not charge members.\n\nThis does not publish a paid plan or a private community. Use the full form for those.\n\nConfirm only if this name is right. I have not created it yet.`,
    links: [{ label: "Open the full form", href: "/communities/create" }],
    followups: ["Yes, create it", "Cancel"],
  };
}

/**
 * Deterministic guide for supported tasks.
 * Returns null when the live assistant should answer.
 * The only executable operation is a confirmed free public community.
 */
export function planGuideTurn(message: string, pending = readPending()): LocalGuideTurn | null {
  const text = message.trim();
  if (!text) return null;

  if (pending?.phase === "need_confirm" && CONFIRM.test(text) && pending.name) {
    return {
      pending: null,
      execute: {
        operation: "create_community",
        name: pending.name,
        description: pending.description,
      },
      content: "",
    };
  }

  if (pending && CANCEL.test(text)) {
    return {
      pending: null,
      content: "Cancelled. Nothing was created. You can start again or open the form yourself.",
      links: [{ label: "Create a community", href: "/communities/create" }],
    };
  }

  if (pending?.phase === "need_name" && !communityIntent(text) && text.length >= 2 && text.length <= 80) {
    const named = extractName(text) ?? text.replace(/^["“']|["”']$/g, "");
    return communityReply(named);
  }

  const workflow = WORKFLOWS.find((item) => item.test.test(text));
  if (workflow) {
    return {
      pending: null,
      content: workflow.content,
      links: workflow.links,
      followups: workflow.followups,
    };
  }

  if (/\b(create|start|set up|setup|build)\b.{0,40}\bcommunity\b/i.test(text) && /\b(paid|private|charge)\b/i.test(text)) {
    return {
      pending: null,
      content:
        "Paid and private communities use the full create form so you can set access and price yourself. I will not create one from chat, and nothing has been charged.",
      links: [{ label: "Create a community", href: "/communities/create" }],
    };
  }

  if (communityIntent(text)) {
    const name = extractName(text);
    if (!name) {
      return {
        pending: { operation: "create_community", phase: "need_name" },
        content:
          "I can create a free public community after you confirm the name.\n\nWhat should the community be called? For a paid or private community, use the full form instead.",
        links: [{ label: "Open the full form", href: "/communities/create" }],
      };
    }
    return communityReply(name);
  }

  return null;
}
