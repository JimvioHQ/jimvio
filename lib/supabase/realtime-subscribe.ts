import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

type PostgresChangeConfig = {
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  schema: "public";
  table: string;
  filter?: string;
};

type PostgresChangePayload = {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

/**
 * Subscribe to postgres_changes without tripping "cannot add callbacks after subscribe()"
 * when React Strict Mode remounts or an async setup races with cleanup.
 */
export async function subscribePostgresChanges(
  supabase: SupabaseClient,
  channelName: string,
  config: PostgresChangeConfig,
  onChange: (payload?: PostgresChangePayload) => void,
  isCancelled: () => boolean,
): Promise<RealtimeChannel | null> {
  if (isCancelled()) return null;

  const topic = `realtime:${channelName}`;
  for (const existing of supabase.getChannels()) {
    if (existing.topic === topic) {
      await supabase.removeChannel(existing);
    }
  }

  if (isCancelled()) return null;

  return supabase
    .channel(channelName)
    .on("postgres_changes", config, (payload) => {
      if (!isCancelled()) onChange(payload as PostgresChangePayload);
    })
    .subscribe();
}

/** Tear down a channel ref, or any channel whose topic starts with `realtime:${prefix}`. */
export function unsubscribeRealtime(
  supabase: SupabaseClient,
  channel: RealtimeChannel | null,
  channelNamePrefix?: string,
) {
  if (channel) {
    supabase.removeChannel(channel);
    return;
  }
  if (!channelNamePrefix) return;

  const topicPrefix = `realtime:${channelNamePrefix}`;
  for (const ch of supabase.getChannels()) {
    if (ch.topic.startsWith(topicPrefix)) {
      supabase.removeChannel(ch);
    }
  }
}
