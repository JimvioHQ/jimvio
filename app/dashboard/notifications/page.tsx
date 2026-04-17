"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, CheckCircle, Package, Truck, MessageSquare, DollarSign, Clock, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, { icon: React.ReactNode, color: string, bg: string }> = {
  order: { icon: <Package className="h-5 w-5" />, color: "text-sky-500", bg: "bg-sky-50" },
  shipping: { icon: <Truck className="h-5 w-5" />, color: "text-indigo-500", bg: "bg-indigo-50" },
  message: { icon: <MessageSquare className="h-5 w-5" />, color: "text-emerald-500", bg: "bg-emerald-50" },
  payment: { icon: <DollarSign className="h-5 w-5" />, color: "text-amber-500", bg: "bg-amber-50" },
  system: { icon: <ShieldCheck className="h-5 w-5" />, color: "text-rose-500", bg: "bg-rose-50" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]    = useState(true);

  useEffect(() => {
    async function load() {
      // Mock notifications for now as we don't have a notifications table yet
      setNotifications([
        { id: 1, type: "order", title: "Order Confirmed", message: "Your order #JV-1002 has been confirmed by the vendor.", time: "2 hours ago", read: false },
        { id: 2, type: "shipping", title: "Order Shipped", message: "Great news! Your items are on their way to your address.", time: "5 hours ago", read: false },
        { id: 3, type: "message", title: "New Message", message: "TechSupplier sent you a new quote for your request.", time: "1 day ago", read: true },
        { id: 4, type: "system", title: "Account Verified", message: "Your vendor verification has been approved.", time: "2 days ago", read: true },
      ]);
      setLoading(false);
    }
    load();
  }, []);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "var(--color-bg)" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-full scale-150 animate-pulse" />
          <div className="relative w-24 h-24 rounded-[32px] bg-surface dark:bg-surface border border-border shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin m-2" />
            <Bell className="h-10 w-10 text-stone-900 dark:text-white" />
          </div>
        </div>
        <div className="text-center space-y-3">
           <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Alert Hub</h2>
           <p className="text-[10px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest pl-[0.1em]">Syncing Your Notifications</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-24 animate-in fade-in duration-700 relative overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="orange" position="bottom-left" />

      <div className="max-w-4xl mx-auto space-y-12 px-6 pt-12 relative z-10">
        
        {/* Header Protocol */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-2">
              <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter flex items-center gap-4">
                 <div className="p-2.5 rounded-[20px] bg-surface dark:bg-surface border border-border shadow-2xl shrink-0">
                    <Bell className="h-8 w-8 text-orange-500" />
                 </div>
                 Alerts
              </h1>
              <p className="text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-[0.3em] pl-16">
                 Stay updated on orders, messages, and platform activity
              </p>
           </div>

           <Button 
              variant="outline" 
              onClick={markAllRead} 
              className="h-14 px-8 rounded-full bg-surface dark:bg-surface text-stone-900 dark:text-white border-border shadow-xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all hover:bg-surface-secondary dark:hover:bg-zinc-800"
           >
              Mark All Read
           </Button>
        </div>

        {/* Signal Registry */}
        <div className="space-y-6">
           {notifications.length === 0 ? (
              <GlassCard className="py-24 text-center rounded-[56px] border-dashed border-stone-200 dark:border-border bg-white dark:bg-surface/20">
                 <div className="w-24 h-24 bg-white dark:bg-surface rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-white shadow-xl">
                    <BellOff className="h-10 w-10 text-stone-100" />
                 </div>
                 <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter">Everything Clear</h3>
                 <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mt-3 max-w-[240px] mx-auto leading-relaxed">No new alerts detected. We'll notify you when something happens.</p>
              </GlassCard>
           ) : (
              <div className="space-y-4">
                 {notifications.map((n) => {
                    const cat = categoryIcons[n.type] || { icon: <Bell className="h-5 w-5" />, color: "text-stone-400", bg: "bg-stone-50 dark:bg-surface/50" };
                    return (
                       <GlassCard key={n.id} className={cn(
                          "p-8 rounded-[40px] flex items-start gap-8 transition-all duration-500 group border-transparent shadow-sm",
                          n.read ? "bg-white dark:bg-surface/40 border-white/60 hover:border-white hover:bg-white dark:bg-surface/60" : "bg-white dark:bg-surface shadow-2xl shadow-orange-500/5 ring-2 ring-orange-500/10"
                       )}>
                          <div className={cn(
                             "h-16 w-16 rounded-[24px] flex items-center justify-center shrink-0 border border-white shadow-xl transition-transform duration-700 group-hover:scale-110",
                             n.read ? "bg-white dark:bg-surface/60 text-stone-400" : cn("bg-white dark:bg-surface", cat.color)
                          )}>
                             {cat.icon}
                          </div>
                          
                          <div className="flex-1 min-w-0 space-y-2">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   <p className="font-black text-xl tracking-tighter text-stone-900 dark:text-white">{n.title}</p>
                                   {!n.read && (
                                      <GlassPill color="orange" className="text-[8px] font-black px-2 py-1">NEW</GlassPill>
                                   )}
                                </div>
                                <span className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em] whitespace-nowrap">{n.time}</span>
                             </div>
                             <p className="text-base text-stone-500 font-bold leading-relaxed tracking-tight">{n.message}</p>
                             
                             <div className="pt-4 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="text-[10px] font-black text-stone-900 dark:text-white uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                                   View Details <ArrowRight className="h-3 w-3" />
                                </button>
                                { !n.read && (
                                   <button className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                      Dismiss
                                   </button>
                                )}
                             </div>
                          </div>
                          
                          {!n.read && (
                             <div className="h-3 w-3 rounded-full bg-orange-500 mt-6 shrink-0 animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
                          )}
                       </GlassCard>
                    );
                 })}
              </div>
           )}
        </div>

        {/* Security Info */}
        <GlassCard className="p-10 rounded-[56px] border-border bg-stone-900 dark:bg-surface-secondary text-white relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
           <div className="flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="space-y-4 text-center md:text-left">
                 <div className="flex items-center justify-center md:justify-start gap-3">
                    <Zap className="h-6 w-6 text-orange-400" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-orange-400">Security Guard</h3>
                 </div>
                 <h2 className="text-3xl font-black tracking-tighter leading-none">Your Data is Secure</h2>
                 <p className="text-stone-400 text-sm font-bold leading-relaxed max-w-md">Jimvio uses end-to-end encryption to ensure your notifications and private data remain safe.</p>
              </div>
              <Link href="/dashboard/settings?tab=security">
                 <Button className="h-16 px-10 rounded-3xl bg-white text-stone-900 font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all hover:bg-stone-100 shrink-0 border-none">
                    Security Settings
                 </Button>
              </Link>
           </div>
        </GlassCard>
      </div>
    </div>
  );
}
