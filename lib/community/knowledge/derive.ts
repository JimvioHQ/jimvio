/**
 * Pure helpers — organize collaboration objects into knowledge surfaces.
 */

import {
  extractPinned,
  extractThreads,
  displayName,
  messageAttachments,
} from "@/lib/community/chat/message-experience";
import type { Msg } from "@/types";
import type {
  AnswerMark,
  KnowledgeCard,
  KnowledgeKind,
  ThreadMeta,
} from "./types";
import { KNOWLEDGE_KIND_LABELS } from "./types";

export function knowledgeFromMessage(
  m: Msg,
  roomId: string,
  kind: KnowledgeKind,
  opts?: {
    title?: string;
    createdBy?: string | null;
    createdByName?: string | null;
    communityId?: string | null;
    tags?: string[];
  }
): KnowledgeCard {
  const now = new Date().toISOString();
  const title =
    opts?.title?.trim() ||
    (m.body || "").trim().split("\n")[0]?.slice(0, 80) ||
    `${KNOWLEDGE_KIND_LABELS[kind]} from ${displayName(m)}`;

  return {
    id: `kn-${m.id}-${kind}-${Date.now()}`,
    roomId,
    communityId: opts?.communityId ?? null,
    kind,
    title,
    body: (m.body || "").trim() || "(attachment)",
    sourceType: m.thread_id ? "thread" : "message",
    sourceMessageId: m.id,
    sourceThreadId: m.thread_id ?? ((m.reply_count ?? 0) > 0 ? m.id : null),
    tags: opts?.tags ?? [],
    featured: false,
    createdAt: now,
    updatedAt: now,
    createdBy: opts?.createdBy ?? null,
    createdByName: opts?.createdByName ?? null,
  };
}

export function knowledgeFromThread(
  root: Msg,
  replies: Msg[],
  roomId: string,
  kind: KnowledgeKind,
  opts?: {
    title?: string;
    createdBy?: string | null;
    createdByName?: string | null;
    communityId?: string | null;
  }
): KnowledgeCard {
  const parts = [
    root.body?.trim(),
    ...replies
      .slice(0, 8)
      .map((r) => `• ${displayName(r)}: ${(r.body || "").trim()}`),
  ].filter(Boolean);
  const base = knowledgeFromMessage(root, roomId, kind, opts);
  return {
    ...base,
    id: `kn-thread-${root.id}-${kind}-${Date.now()}`,
    sourceType: "thread",
    sourceThreadId: root.id,
    body: parts.join("\n\n"),
    title:
      opts?.title?.trim() ||
      `Thread: ${(root.body || "").trim().slice(0, 60) || displayName(root)}`,
  };
}

export type KnowledgeBuckets = {
  faqs: KnowledgeCard[];
  tutorials: KnowledgeCard[];
  guides: KnowledgeCard[];
  bestPractices: KnowledgeCard[];
  pinnedCollections: KnowledgeCard[];
  learningPaths: KnowledgeCard[];
  importantDiscussions: KnowledgeCard[];
  collections: KnowledgeCard[];
  cards: KnowledgeCard[];
  answered: KnowledgeCard[];
};

/** Auto-organize live messages into knowledge buckets (no extra fetch). */
export function organizeKnowledgeBuckets(
  roomId: string,
  messages: Msg[],
  cards: KnowledgeCard[],
  answers: AnswerMark[],
  threadMeta: ThreadMeta[]
): KnowledgeBuckets {
  const roomCards = cards.filter((c) => c.roomId === roomId);
  const byKind = (k: KnowledgeKind) => roomCards.filter((c) => c.kind === k);

  const answeredIds = new Set(
    answers.filter((a) => a.roomId === roomId).map((a) => a.messageId)
  );
  const answered: KnowledgeCard[] = messages
    .filter((m) => answeredIds.has(m.id) && !m.is_deleted)
    .map((m) => {
      const pick = answers.find((a) => a.messageId === m.id)?.pick;
      return knowledgeFromMessage(m, roomId, "faq", {
        title: `${pick ? String(pick) : "Answer"}: ${(m.body || "").slice(0, 60)}`,
        tags: pick ? [pick] : ["answer"],
      });
    });

  const pinnedCollections = extractPinned(messages)
    .slice(0, 12)
    .map((m) =>
      knowledgeFromMessage(m, roomId, "collection", {
        title: `Pinned · ${(m.body || "").trim().slice(0, 50) || displayName(m)}`,
        tags: ["pinned"],
      })
    );

  const important = extractThreads(messages)
    .filter((m) => (m.reply_count ?? 0) >= 2 || m.is_pinned)
    .slice(0, 12)
    .map((m) =>
      knowledgeFromMessage(m, roomId, "important_discussion", {
        title: `Discussion · ${(m.body || "").trim().slice(0, 50) || displayName(m)}`,
        tags: ["thread"],
      })
    );

  const featuredThreads = threadMeta
    .filter((t) => t.roomId === roomId && (t.featured || t.pinned))
    .map((t) => {
      const root = messages.find((m) => m.id === t.threadId);
      if (!root) return null;
      return knowledgeFromMessage(root, roomId, "important_discussion", {
        title:
          t.summary?.slice(0, 80) ||
          `Featured · ${(root.body || "").slice(0, 50)}`,
        tags: ["featured"],
      });
    })
    .filter((x): x is KnowledgeCard => !!x);

  return {
    faqs: byKind("faq"),
    tutorials: byKind("tutorial"),
    guides: byKind("guide"),
    bestPractices: byKind("best_practice"),
    pinnedCollections,
    learningPaths: byKind("learning_path"),
    importantDiscussions: [...featuredThreads, ...important],
    collections: byKind("collection"),
    cards: [
      ...byKind("knowledge_card"),
      ...byKind("course_note"),
      ...byKind("resource"),
    ],
    answered,
  };
}

export function topContributors(
  messages: Msg[],
  limit = 5
): { userId: string; name: string; avatar: string | null; count: number }[] {
  const map = new Map<
    string,
    { userId: string; name: string; avatar: string | null; count: number }
  >();
  for (const m of messages) {
    if (m.is_deleted || m.message_type === "system") continue;
    const cur = map.get(m.sender_id);
    if (cur) cur.count += 1;
    else {
      map.set(m.sender_id, {
        userId: m.sender_id,
        name: displayName(m),
        avatar: m.profiles?.avatar_url ?? null,
        count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export function recentDiscussions(messages: Msg[], limit = 6): Msg[] {
  return messages
    .filter((m) => !m.thread_id && !m.is_deleted && m.message_type !== "system")
    .slice()
    .reverse()
    .slice(0, limit);
}

export function popularThreads(messages: Msg[], limit = 8): Msg[] {
  return extractThreads(messages)
    .slice()
    .sort((a, b) => (b.reply_count ?? 0) - (a.reply_count ?? 0))
    .slice(0, limit);
}

export function searchKnowledge(
  cards: KnowledgeCard[],
  query: string
): KnowledgeCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return cards;
  return cards.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.body.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q)) ||
      c.kind.includes(q)
  );
}

export function fileHasAttachments(m: Msg): boolean {
  return messageAttachments(m).length > 0;
}
