"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  Flag,
  Loader2,
  MessageCircle,
  Target,
  Users,
} from "lucide-react";
import { useAIStore } from "@/lib/store/use-ai-store";

type HubInsightRow = {
  id: string;
  title: string;
  subtext: string;
  icon: "audience" | "trend" | "collab" | "missions";
  highlight?: boolean;
  prompt: string;
};

type HubDashboard = {
  insights?: {
    postCount30d?: number;
    engagement30d?: number;
    communitiesJoined?: number;
  };
  challenge?: {
    title: string;
    description: string;
    completed: number;
    target: number;
  } | null;
  stats?: {
    membersOnline?: number;
    liveSessions?: number;
  };
};

const INSIGHT_ICONS = {
  audience: MessageCircle,
  trend: Target,
  collab: Users,
  missions: Flag,
} as const;

function buildInsightRows(data: HubDashboard | null): HubInsightRow[] {
  if (!data) return [];
  const rows: HubInsightRow[] = [];
  const posts = data.insights?.postCount30d ?? 0;
  const engagement = data.insights?.engagement30d ?? 0;
  const communities = data.insights?.communitiesJoined ?? 0;
  const online = data.stats?.membersOnline ?? 0;
  const challenge = data.challenge;

  if (posts > 0 || engagement > 0) {
    rows.push({
      id: "engagement",
      title: `${engagement} engagements (30d)`,
      subtext: `${posts} post${posts === 1 ? "" : "s"} published`,
      icon: "audience",
      prompt: `I have ${posts} posts and ${engagement} engagements in the last 30 days. How can I grow my community presence on Jimvio?`,
    });
  }

  if (communities > 0) {
    rows.push({
      id: "communities",
      title: `${communities} communities joined`,
      subtext: online > 0 ? `${online} members online now` : "Keep contributing",
      icon: "collab",
      prompt: `I'm in ${communities} communities. Suggest what I should post or engage with next.`,
    });
  } else if (online > 0) {
    rows.push({
      id: "online",
      title: `${online} members online`,
      subtext: "Good time to engage",
      icon: "trend",
      prompt: `There are ${online} members online. What should I do in Communities right now?`,
    });
  }

  if (challenge) {
    rows.push({
      id: "challenge",
      title: challenge.title,
      subtext: `${challenge.completed}/${challenge.target} complete`,
      icon: "missions",
      highlight: true,
      prompt: `Help me finish this community challenge: ${challenge.title}. Progress ${challenge.completed}/${challenge.target}. ${challenge.description}`,
    });
  }

  if (rows.length === 0) {
    rows.push({
      id: "start",
      title: "Ready when you are",
      subtext: "Ask Jimvio AI for next steps",
      icon: "trend",
      prompt: "Help me decide what to do next in Jimvio Communities.",
    });
  }

  return rows.slice(0, 4);
}

export function AIAssistantPanel() {
  const openAssistant = useAIStore((s) => s.openAssistant);
  const [query, setQuery] = useState("");
  const [hub, setHub] = useState<HubDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/c/hub", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setHub(null);
          return;
        }
        const json = (await res.json()) as HubDashboard;
        if (!cancelled) setHub(json);
      } catch {
        if (!cancelled) setHub(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const insights = useMemo(() => buildInsightRows(hub), [hub]);

  function submitAsk() {
    const q = query.trim();
    openAssistant(
      q ||
        "Here are my community insights. Help me decide what to do next on Jimvio.",
    );
    setQuery("");
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FF5A1F]">
          <Bot className="h-3.5 w-3.5 text-white" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-gray-900">AI Assistant</p>
          <p className="flex items-center gap-1 text-[10px] text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mb-2 flex justify-center py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" aria-hidden />
        </div>
      ) : (
        <ul className="mb-2 space-y-1">
          {insights.map((insight) => {
            const Icon = INSIGHT_ICONS[insight.icon];
            return (
              <li key={insight.id}>
                <button
                  type="button"
                  onClick={() => openAssistant(insight.prompt)}
                  className="flex w-full items-start gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-gray-50"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-orange-100 bg-orange-50">
                    <Icon className="h-3 w-3 text-[#FF5A1F]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-semibold leading-tight text-gray-900">
                      {insight.title}
                    </span>
                    <span
                      className={`block truncate text-[10.5px] leading-tight ${
                        insight.highlight ? "font-medium text-[#FF5A1F]" : "text-gray-500"
                      }`}
                    >
                      {insight.subtext}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitAsk();
            }
          }}
          placeholder="Ask anything…"
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#FF5A1F]/50 focus:ring-2 focus:ring-[#FF5A1F]/10"
        />
        <button
          type="button"
          aria-label="Ask AI Assistant"
          onClick={submitAsk}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FF5A1F] text-white transition-colors hover:bg-[#e64e18]"
        >
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </section>
  );
}
