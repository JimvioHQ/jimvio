import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserNotifications } from "@/services/db";
import { redirect } from "next/navigation";
import { Bell, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import { MarkReadButton } from "./mark-read-button";

export default async function DashboardNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const notifications = await getUserNotifications(user.id, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Notifications</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Comments on your posts, replies to your comments, and other activity.
        </p>
      </div>

      {notifications.length === 0 ? (
        <Card className="rounded-2xl shadow-sm border-[var(--color-border)] overflow-hidden">
          <CardContent className="py-16 text-center">
            <Bell className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">No notifications</h3>
            <p className="text-sm text-[var(--color-text-muted)]">When someone comments or replies, you’ll see it here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: { id: string; type: string; title: string; message: string; action_url: string | null; is_read: boolean; created_at: string }) => (
            <Card
              key={n.id}
              className={`rounded-2xl shadow-sm transition-shadow duration-200 ${!n.is_read ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5" : ""}`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center shrink-0">
                  {n.type === "community" ? (
                    <MessageSquare className="h-5 w-5 text-[var(--color-accent)]" />
                  ) : (
                    <Bell className="h-5 w-5 text-[var(--color-text-muted)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--color-text-primary)]">{n.title}</p>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-[var(--color-text-muted)]">{timeAgo(n.created_at)}</span>
                    {n.action_url && (
                      <Link href={n.action_url} className="text-xs font-bold text-[var(--color-accent)] hover:underline">
                        View
                      </Link>
                    )}
                    {!n.is_read && <MarkReadButton notificationId={n.id} />}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
