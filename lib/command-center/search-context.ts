/**
 * Mutable search context for community-scoped Command Center results.
 * Set by Creator Command Center shell; read by composite search providers.
 */

export type CommandSearchContext = {
  communityId?: string;
  communitySlug?: string;
  base?: string;
};

let context: CommandSearchContext = {};

export function setCommandSearchContext(next: CommandSearchContext) {
  context = { ...next };
}

export function getCommandSearchContext(): CommandSearchContext {
  return context;
}
