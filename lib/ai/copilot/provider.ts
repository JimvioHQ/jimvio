import type { CopilotProvider } from "./types";
import { httpCopilotProvider } from "./http-provider";
import { stubCopilotProvider } from "./stub-provider";

export type CopilotProviderId = "jimvio-ai" | "stub" | "openai" | "gemini" | "claude" | "deepseek";

const PROVIDERS: Record<CopilotProviderId, CopilotProvider | undefined> = {
  "jimvio-ai": httpCopilotProvider,
  stub: stubCopilotProvider,
  openai: undefined,
  gemini: undefined,
  claude: undefined,
  deepseek: undefined,
};

/** Live Jimvio AI route. Named providers that are not configured fall back to that route, not a fake reply. */
export function getCopilotProvider(id: CopilotProviderId = "jimvio-ai"): CopilotProvider {
  return PROVIDERS[id] ?? httpCopilotProvider;
}

export { stubCopilotProvider };
