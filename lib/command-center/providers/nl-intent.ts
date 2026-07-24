/**
 * Natural-language command provider for ⌘K AI Universal Command.
 */

import { resolveNlCommandIntents } from "@/lib/ai/native";
import type {
  CommandResult,
  CommandSearchInput,
  CommandSearchOutput,
  CommandSearchProvider,
} from "../types";

export const nlIntentSearchProvider: CommandSearchProvider = {
  id: "nl-intent",
  async search(input: CommandSearchInput): Promise<CommandSearchOutput> {
    const query = input.query.trim();
    if (query.length < 2) return { groups: [], flat: [] };

    const intents = resolveNlCommandIntents(query).slice(0, input.limit ?? 8);
    const items: CommandResult[] = intents.map((intent) => ({
      id: intent.id,
      kind: intent.actionId === "open-ai" ? "ai" : "command",
      title: intent.title,
      subtitle: intent.subtitle,
      href: intent.href,
      actionId: intent.actionId,
      keywords: intent.keywords,
      icon: intent.actionId === "open-ai" ? "sparkles" : "command",
      badge: "AI",
      section: "search",
      score: intent.score,
    }));

    return {
      groups: items.length
        ? [{ id: "ai-commands", label: "AI commands", items }]
        : [],
      flat: items,
    };
  },
};
