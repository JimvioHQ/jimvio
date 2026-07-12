import type { CopilotProvider } from "./types";
import { stubCopilotProvider } from "./stub-provider";

export type CopilotProviderId = "stub" | "openai" | "gemini" | "claude" | "deepseek";

const PROVIDERS: Record<CopilotProviderId, CopilotProvider | undefined> = {
  stub: stubCopilotProvider,
  openai: undefined,
  gemini: undefined,
  claude: undefined,
  deepseek: undefined,
};

/** Resolve active provider — defaults to stub until backend is connected. */
export function getCopilotProvider(id: CopilotProviderId = "stub"): CopilotProvider {
  return PROVIDERS[id] ?? stubCopilotProvider;
}

export { stubCopilotProvider };
