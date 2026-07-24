/**
 * AI Native provider registry — plug future LLMs without UI changes.
 */

import type {
  AiAnalyticsProvider,
  AiContentProvider,
  AiKnowledgeProvider,
  AiModerationProvider,
  AiPersonalizationProvider,
  AiProviderId,
} from "./types";
import {
  localAnalyticsProvider,
  localContentProvider,
  localKnowledgeProvider,
  localModerationProvider,
  localPersonalizationProvider,
} from "./local-providers";

type Registry = {
  content: Partial<Record<AiProviderId, AiContentProvider>>;
  analytics: Partial<Record<AiProviderId, AiAnalyticsProvider>>;
  moderation: Partial<Record<AiProviderId, AiModerationProvider>>;
  knowledge: Partial<Record<AiProviderId, AiKnowledgeProvider>>;
  personalization: Partial<Record<AiProviderId, AiPersonalizationProvider>>;
};

const registry: Registry = {
  content: { local: localContentProvider, openai: undefined, gemini: undefined, claude: undefined, llama: undefined },
  analytics: { local: localAnalyticsProvider, openai: undefined, gemini: undefined, claude: undefined, llama: undefined },
  moderation: { local: localModerationProvider, openai: undefined, gemini: undefined, claude: undefined, llama: undefined },
  knowledge: { local: localKnowledgeProvider, openai: undefined, gemini: undefined, claude: undefined, llama: undefined },
  personalization: {
    local: localPersonalizationProvider,
    openai: undefined,
    gemini: undefined,
    claude: undefined,
    llama: undefined,
  },
};

let activeId: AiProviderId = "local";

export function setAiNativeProviderId(id: AiProviderId) {
  activeId = id;
}

export function getAiNativeProviderId(): AiProviderId {
  return activeId;
}

export function getAiContentProvider(): AiContentProvider {
  return registry.content[activeId] ?? localContentProvider;
}

export function getAiAnalyticsProvider(): AiAnalyticsProvider {
  return registry.analytics[activeId] ?? localAnalyticsProvider;
}

export function getAiModerationProvider(): AiModerationProvider {
  return registry.moderation[activeId] ?? localModerationProvider;
}

export function getAiKnowledgeProvider(): AiKnowledgeProvider {
  return registry.knowledge[activeId] ?? localKnowledgeProvider;
}

export function getAiPersonalizationProvider(): AiPersonalizationProvider {
  return registry.personalization[activeId] ?? localPersonalizationProvider;
}

/** Register a remote provider implementation when backends are ready. */
export function registerAiContentProvider(provider: AiContentProvider) {
  registry.content[provider.id] = provider;
}
export function registerAiAnalyticsProvider(provider: AiAnalyticsProvider) {
  registry.analytics[provider.id] = provider;
}
export function registerAiModerationProvider(provider: AiModerationProvider) {
  registry.moderation[provider.id] = provider;
}
export function registerAiKnowledgeProvider(provider: AiKnowledgeProvider) {
  registry.knowledge[provider.id] = provider;
}
export function registerAiPersonalizationProvider(provider: AiPersonalizationProvider) {
  registry.personalization[provider.id] = provider;
}
