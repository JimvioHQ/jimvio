"use client";

import {
  ArrowUpRight,
  Bot,
  Flag,
  MessageCircle,
  MoreVertical,
  Target,
  User,
} from "lucide-react";
import { AI_INSIGHTS } from "@/lib/feed/mock-data";

const INSIGHT_ICONS = {
  audience: MessageCircle,
  trend: Target,
  collab: User,
  missions: Flag,
} as const;

export function AIAssistantPanel() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500">
            <Bot className="h-5 w-5 text-white" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-bold text-gray-900">AI Assistant</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Online
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="More options"
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Greeting */}
      <div className="mb-4">
        <p className="text-sm font-bold text-gray-900">Hi John! 👋</p>
        <p className="mt-0.5 text-sm text-gray-800">Here are your insights for today.</p>
      </div>

      {/* Insight cards */}
      <ul className="mb-4 space-y-2">
        {AI_INSIGHTS.map((insight) => {
          const Icon = INSIGHT_ICONS[insight.icon as keyof typeof INSIGHT_ICONS] ?? Target;
          return (
            <li
              key={insight.title}
              className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-200 bg-white">
                <Icon className="h-4 w-4 text-orange-500" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
                <p
                  className={`text-xs ${
                    insight.highlight ? "font-medium text-orange-500" : "text-gray-500"
                  }`}
                >
                  {insight.subtext}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask me anything..."
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
        />
        <button
          type="button"
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white transition-colors hover:bg-orange-600"
        >
          <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
