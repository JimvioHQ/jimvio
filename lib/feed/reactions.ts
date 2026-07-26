/** Multi-reaction vocabulary for feed posts. */

export const POST_REACTIONS = [
  { id: "like", emoji: "👍", label: "Like" },
  { id: "love", emoji: "❤️", label: "Love" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "clap", emoji: "👏", label: "Clap" },
  { id: "laugh", emoji: "😂", label: "Laugh" },
  { id: "wow", emoji: "😮", label: "Wow" },
  { id: "sad", emoji: "😢", label: "Sad" },
  { id: "angry", emoji: "😡", label: "Angry" },
] as const;

export type PostReactionId = (typeof POST_REACTIONS)[number]["id"];

export function isPostReactionId(value: string): value is PostReactionId {
  return POST_REACTIONS.some((r) => r.id === value);
}

export function reactionEmoji(id: PostReactionId): string {
  return POST_REACTIONS.find((r) => r.id === id)?.emoji ?? "👍";
}
