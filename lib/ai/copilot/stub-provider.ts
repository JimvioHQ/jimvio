import { getCopilotContextMeta } from "./context";
import type { CopilotProvider, CopilotSendInput, CopilotStreamChunk } from "./types";

function buildStubMarkdown(input: CopilotSendInput): string {
  const meta = getCopilotContextMeta(input.context);
  const userLine = input.message.trim();

  return `### Jimvio Copilot (preview)

You're on **${meta.label}** — ${meta.description}

> **Your question:** ${userLine}

I'm your Jimvio assistant architecture preview. Live intelligence from OpenAI, Gemini, Claude, or DeepSeek will plug in here without UI changes.

**What I can help with soon:**
- Product discovery and comparisons
- Affiliate & UGC campaign matching
- Community and creator recommendations
- Seller listing optimization

\`\`\`ts
// Future provider hook — no UI redesign needed
const provider = getCopilotProvider("openai");
for await (const chunk of provider.send(input)) {
  appendStream(chunk);
}
\`\`\`

| Signal | Status |
| --- | --- |
| Page context | \`${input.context}\` |
| Route | \`${input.pathname}\` |
| Provider | \`stub\` (frontend only) |

Browse the [marketplace](/marketplace) or explore [UGC campaigns](/ugc) while we finish connecting the AI backend.`;
}

function buildFollowups(input: CopilotSendInput): string[] {
  const common = ["Show trending products", "Find UGC campaigns", "Recommend communities"];
  switch (input.context) {
    case "product":
      return ["Compare similar products", "Summarize reviews", "Is this good value?"];
    case "cart":
      return ["Suggest add-ons", "Find a better deal", "Explain shipping"];
    case "checkout":
      return ["Explain my total", "Shipping options", "Payment help"];
    case "seller-dashboard":
      return ["Improve my listing", "Pricing tips", "Launch a campaign"];
    case "communities":
      return ["Find creators to collaborate", "Growing my community", "Monetization ideas"];
    case "affiliate":
      return ["Highest commissions", "UGC opportunities", "Content ideas"];
    case "marketplace":
      return ["Profitable niches", "Compare top picks", "Search with AI"];
    default:
      return common;
  }
}

async function* streamText(text: string): AsyncGenerator<CopilotStreamChunk> {
  const tokens = text.split(/(\s+)/);
  for (const token of tokens) {
    if (!token) continue;
    yield { type: "text-delta", text: token };
    await new Promise((r) => setTimeout(r, token.trim() ? 14 : 4));
  }
  yield { type: "done" };
}

/** Frontend-only provider — simulates streaming without calling any API. */
export const stubCopilotProvider: CopilotProvider = {
  id: "stub",
  async *send(input: CopilotSendInput): AsyncIterable<CopilotStreamChunk> {
    const markdown = buildStubMarkdown(input);
    yield* streamText(markdown);
    yield {
      type: "metadata",
      message: {
        followups: buildFollowups(input),
        links: [
          { label: "Browse Marketplace", href: "/marketplace" },
          { label: "UGC Campaigns", href: "/ugc" },
        ],
      },
    };
  },
};
