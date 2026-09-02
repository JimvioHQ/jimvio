/**
 * Suggestion chips shown in the Command Center's empty and zero-result states.
 * Each chip either fills the search query (for NL prompts) or executes a
 * known static command directly.
 */

export type SuggestionChip = {
  id: string;
  label: string;
} & (
  | { type: "query"; query: string }
  | { type: "command"; commandId: string }
);

/** Natural-language sample prompts — filled into the search box, not executed directly. */
export const NL_SUGGESTION_CHIPS: SuggestionChip[] = [
  { id: "chip-nl-create-campaign", type: "query", label: "Create a campaign for my headphones", query: "create a campaign for my headphones" },
  { id: "chip-nl-find-creators", type: "query", label: "Find creators", query: "find creators" },
  { id: "chip-nl-todays-sales", type: "query", label: "Show today's sales", query: "show today's sales" },
  { id: "chip-nl-open-wallet", type: "query", label: "Open wallet", query: "open wallet" },
  { id: "chip-nl-product-description", type: "query", label: "Generate a product description", query: "generate product description" },
  { id: "chip-nl-analyze-business", type: "query", label: "Analyze my business", query: "analyze my business" },
];

/** Direct actions — execute immediately against a known static command. */
export const ACTION_SUGGESTION_CHIPS: SuggestionChip[] = [
  { id: "chip-cmd-create-ugc-campaign", type: "command", label: "Create UGC Campaign", commandId: "create-ugc-campaign" },
  { id: "chip-cmd-start-live", type: "command", label: "Start Live", commandId: "start-live" },
  { id: "chip-cmd-open-wallet-os", type: "command", label: "Open Wallet", commandId: "open-wallet-os" },
  { id: "chip-cmd-open-ai", type: "command", label: "Ask Jimvio AI", commandId: "open-ai" },
];

/** Combined default set for empty / zero-result states. */
export const SUGGESTION_CHIPS: SuggestionChip[] = [
  ...ACTION_SUGGESTION_CHIPS,
  ...NL_SUGGESTION_CHIPS,
];
