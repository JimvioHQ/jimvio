"use client";

import React from "react";
import { Megaphone, Users, DollarSign, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface LivePlatformActivityProps {
  campaigns: number;
  communities: number;
  earnings: number;
  className?: string;
}

export function LivePlatformActivity({
  campaigns = 0,
  communities = 0,
  earnings = 0,
  className,
}: LivePlatformActivityProps) {
  
  const stats = [
    {
      label: "Active Missions",
      value: campaigns.toLocaleString(),
      icon: Megaphone,
      color: "from-orange-500 to-amber-500",
      bg: "bg-orange-50",
    },
    {
      label: "Live Communities",
      value: communities.toLocaleString(),
      icon: Users,
      color: "from-blue-600 to-indigo-600",
      bg: "bg-blue-50",
    },
    {
      label: "Paid to Creators",
      value: earnings > 1000 ? (earnings / 1000).toFixed(1) + "k+" : earnings.toLocaleString(),
      icon: DollarSign,
      color: "from-emerald-600 to-teal-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Growth Index",
      value: "94.2%",
      icon: TrendingUp,
      color: "from-violet-600 to-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {stats.map((stat, i) => (
        <div 
          key={i}
          className="relative group p-5 rounded-3xl bg-white dark:bg-surface border border-[#ebe8f2] shadow-sm hover:shadow-xl hover:border-orange-500/20 transition-all duration-300"
        >
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3 duration-300 shadow-inner",
            stat.bg
          )}>
            <stat.icon className={cn("h-6 w-6 bg-clip-text text-transparent bg-gradient-to-br", stat.color)} />
          </div>
          
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">
              {stat.value}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {stat.label}
            </p>
          </div>
          
          <div className="absolute top-4 right-4 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
