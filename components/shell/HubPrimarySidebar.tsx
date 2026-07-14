"use client";

import { PrimarySidebar, resolveSidebarActiveItem } from "@/components/shell/PrimarySidebar";
import { usePathname, useRouter } from "next/navigation";
import HubSidebar from "@/app/c/components/sidebar";
import { useState, useRef, useEffect } from "react";
import { Bell, X, MessageSquare, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type HubPrimarySidebarProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  username?: string;
  unreadMessages?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
};

export default function HubPrimarySidebar({
  collapsed,
  onToggleCollapse,
  username,
  unreadMessages,
  mobileOpen,
  onMobileClose,
  unreadNotifications,
  onOpenNotifications,
}: HubPrimarySidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
    actor?: { username: string; avatar_url: string | null };
  }>>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Load notifications when drawer opens
  useEffect(() => {
    if (notificationsOpen && notifications.length === 0) {
      loadNotifications();
    }
  }, [notificationsOpen]);

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select(`
          id,
          type,
          title,
          message,
          created_at,
          is_read,
          actor:profiles!notifications_actor_id_fkey(username, avatar_url)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data as any);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const supabase = createClient();
      await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === "message" || notification.type === "reply") {
      router.push("/c/messages");
    } else if (notification.type === "community_invite" || notification.type === "community_post") {
      router.push(`/c/${notification.data?.community_slug}`);
    } else if (notification.type === "live_started") {
      router.push("/c/live");
    } else {
      router.push("/c");
    }
    setNotificationsOpen(false);
  };

  return (
    <>
      <div className="hidden h-full shrink-0 lg:block">
        <PrimarySidebar 
          activeItem={resolveSidebarActiveItem(pathname)} 
          collapsed={collapsed} 
          onToggleCollapse={onToggleCollapse}
          onNotificationOpen={onOpenNotifications}
          unreadNotifications={unreadNotifications}
        />
      </div>
      
      {/* Notification Drawer - Right to Left */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setNotificationsOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={(e) => e.stopPropagation()} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[var(--color-bg)] shadow-xl animate-slide-in-right flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg)] z-10">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Notifications</h2>
              <div className="flex items-center gap-2">
                {!loadingNotifications && notifications.some(n => !n.is_read) && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-[var(--color-accent)] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
                  aria-label="Close notifications"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4" ref={notificationsRef}>
              {loadingNotifications ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-[var(--color-text-muted)]">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No notifications yet</p>
                  <p className="text-sm mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "w-full p-3 rounded-xl text-left transition-colors border border-[var(--color-border)]",
                        !notification.is_read
                          ? "bg-[var(--color-accent)]/5 ring-1 ring-[var(--color-accent)]/20"
                          : "bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)]"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                          !notification.is_read 
                            ? "bg-[var(--color-accent)]/10" 
                            : "bg-[var(--color-surface-secondary)]"
                        )}>
                          {notification.actor?.avatar_url ? (
                            <img 
                              src={notification.actor.avatar_url} 
                              alt={notification.actor.username} 
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <MessageSquare className="h-4 w-4 text-[var(--color-text-muted)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              "font-medium text-sm leading-snug",
                              !notification.is_read ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
                            )}>
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <span className="flex-shrink-0 h-2 w-2 rounded-full animate-breathe bg-[var(--color-accent)]" />
                            )}
                          </div>
                          <p className={cn(
                            "mt-1 text-sm line-clamp-2",
                            !notification.is_read ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-muted)]"
                          )}>
                            {notification.message}
                          </p>
                          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mobileOpen && (
        <HubSidebar
          collapsed={false}
          username={username ?? ""}
          unreadMessages={unreadMessages ?? 0}
          mobileOpen={mobileOpen}
          onMobileClose={onMobileClose}
        />
      )}
    </>
  );
}
