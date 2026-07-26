/**
 * Client realtime subscription with reconnect/retry for the notification inbox.
 */

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type NotificationRealtimeHandlers = {
  onChange: () => void;
  onStatus?: (status: string) => void;
};

/**
 * Subscribe to postgres_changes on notifications for a user.
 * Supabase channels auto-rejoin after reconnect; we also re-invoke onChange
 * when the channel becomes SUBSCRIBED again (retry-after-reconnect).
 */
export function subscribeUserNotifications(
  supabase: SupabaseClient,
  userId: string,
  handlers: NotificationRealtimeHandlers
): () => void {
  let channel: RealtimeChannel | null = null;
  let disposed = false;
  let wasSubscribed = false;

  const start = () => {
    if (disposed) return;
    channel = supabase
      .channel(`notifications-platform-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          handlers.onChange();
        }
      )
      .subscribe((status) => {
        handlers.onStatus?.(status);
        if (status === "SUBSCRIBED") {
          if (wasSubscribed) {
            // Reconnected — refresh to catch anything missed offline.
            handlers.onChange();
          }
          wasSubscribed = true;
        }
      });
  };

  start();

  return () => {
    disposed = true;
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  };
}
