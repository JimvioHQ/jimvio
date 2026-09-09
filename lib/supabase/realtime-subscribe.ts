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

type Listener = {
  config: PostgresChangeConfig;
  onChange: (payload?: PostgresChangePayload) => void;
};

export type RealtimeSubscribeOptions = {
  /** Fired for channel status changes (SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT, CLOSED). */
  onStatus?: (status: string) => void;
};

/** Generation tokens prevent Strict Mode / async races from killing a newer subscription. */
const channelGenerations = new Map<string, number>();

function bumpGeneration(channelName: string): number {
  const next = (channelGenerations.get(channelName) ?? 0) + 1;
  channelGenerations.set(channelName, next);
  return next;
}

function isStale(channelName: string, gen: number): boolean {
  return channelGenerations.get(channelName) !== gen;
}

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
  opts?: RealtimeSubscribeOptions,
): Promise<RealtimeChannel | null> {
  return subscribePostgresChangesMany(
    supabase,
    channelName,
    [{ config, onChange }],
    isCancelled,
    opts,
  );
}

/** Multiple postgres_changes listeners on one channel (e.g. INSERT + UPDATE). */
export async function subscribePostgresChangesMany(
  supabase: SupabaseClient,
  channelName: string,
  listeners: Listener[],
  isCancelled: () => boolean,
  opts?: RealtimeSubscribeOptions,
): Promise<RealtimeChannel | null> {
  if (isCancelled() || listeners.length === 0) return null;

  const gen = bumpGeneration(channelName);
  const topic = `realtime:${channelName}`;

  for (const existing of supabase.getChannels()) {
    if (existing.topic === topic) {
      await supabase.removeChannel(existing);
    }
  }

  if (isCancelled() || isStale(channelName, gen)) return null;

  // Ensure Realtime uses the current JWT so RLS-scoped events are delivered.
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      await supabase.realtime.setAuth(token);
    }
  } catch {
    /* non-fatal — client may still have a cached token */
  }

  if (isCancelled() || isStale(channelName, gen)) return null;

  let channel = supabase.channel(channelName);
  for (const { config, onChange } of listeners) {
    channel = channel.on("postgres_changes", config, (payload) => {
      if (!isCancelled() && !isStale(channelName, gen)) {
        onChange(payload as PostgresChangePayload);
      }
    });
  }

  const subscribed = channel.subscribe((status) => {
    if (isCancelled() || isStale(channelName, gen)) return;
    opts?.onStatus?.(status);
  });

  if (isCancelled() || isStale(channelName, gen)) {
    await supabase.removeChannel(channel);
    return null;
  }

  return subscribed;
}

/** Tear down a channel ref, or any channel whose topic starts with `realtime:${prefix}`. */
export function unsubscribeRealtime(
  supabase: SupabaseClient,
  channel: RealtimeChannel | null,
  channelNamePrefix?: string,
) {
  if (channelNamePrefix) {
    bumpGeneration(channelNamePrefix);
  }

  if (channel) {
    void supabase.removeChannel(channel);
    return;
  }
  if (!channelNamePrefix) return;

  const topicPrefix = `realtime:${channelNamePrefix}`;
  for (const ch of supabase.getChannels()) {
    if (ch.topic.startsWith(topicPrefix)) {
      void supabase.removeChannel(ch);
    }
  }
}
