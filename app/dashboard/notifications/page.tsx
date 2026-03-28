"use client";

import React, { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle, Package, Truck, MessageSquare, DollarSign, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, React.ReactNode> = {
  order: <Package className="h-4 w-4" />,
  shipping: <Truck className="h-4 w-4" />,
  message: <MessageSquare className="h-4 w-4" />,
  payment: <DollarSign className="h-4 w-4" />,
  system: <Clock className="h-4 w-4" />,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]    = useState(true);

  useEffect(() => {
    async function load() {
      // Mock notifications for now as we don't have a notifications table yet
      // This provides immediate UI utility while the backend is catching up.
      setNotifications([
        { id: 1, type: "order", title: "Order Confirmed", message: "Your order #JV-1002 has been confirmed by the vendor.", time: "2 hours ago", read: false },
        { id: 2, type: "shipping", title: "Order Shipped", message: "Great news! Your items are on their way to your address.", time: "5 hours ago", read: false },
        { id: 3, type: "message", title: "New Message", message: "TechSupplier sent you a new quote for your request.", time: "1 day ago", read: true },
        { id: 4, type: "system", title: "Profile Verified", message: "Your vendor verification has been approved.", time: "2 days ago", read: true },
      ]);
      setLoading(false);
    }
    load();
  }, []);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[var(--color-text-primary)]">Notifications</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5 font-medium">Stay updated with your latest alerts</p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead} className="rounded-xl font-bold uppercase tracking-widest text-[10px] px-5"> Mark all as read</Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-[var(--color-surface-secondary)] animate-pulse" />)
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl">
            <BellOff className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">No notifications</h3>
            <p className="text-[var(--color-text-muted)] max-w-xs mx-auto mt-2 text-sm">We'll let you know when something important happens.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <Card key={n.id} className={cn(
              "overflow-hidden border transition-all rounded-2xl group",
              n.read ? "bg-[var(--color-surface)] border-[var(--color-border)]/60" : "bg-[var(--color-surface)] border-[var(--color-accent)]/30 ring-1 ring-[var(--color-accent)]/10 shadow-lg shadow-[var(--color-accent)]/5"
            )}>
              <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                  n.read ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]" : "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                )}>
                  {categoryIcons[n.type] || <Bell className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-black text-[var(--color-text-primary)]">{n.title}</h4>
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{n.time}</span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed">{n.message}</p>
                </div>
                {!n.read && <div className="h-2 w-2 rounded-full bg-[var(--color-accent)] mt-2 shrink-0 animate-pulse" />}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
