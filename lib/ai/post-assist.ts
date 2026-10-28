/**
 * Prompt rules for the post-composer AI writer. Kept pure so the honesty
 * rules are unit-tested: the model may help phrase the member's own idea but
 * must not invent facts, numbers, results, testimonials or promises.
 */
export type PostAssistAction = "draft" | "improve" | "shorten";

export const POST_ASSIST_ACTIONS: readonly PostAssistAction[] = ["draft", "improve", "shorten"];

export function parsePostAssistAction(raw: unknown): PostAssistAction | null {
  return typeof raw === "string" && (POST_ASSIST_ACTIONS as readonly string[]).includes(raw)
    ? (raw as PostAssistAction)
    : null;
}

const RULES = [
  "You help a Jimvio member write a social post for their community feed.",
  "Write in the member's voice (first person), friendly and clear. No title, no quotes around the post.",
  "Use the same language the member wrote in.",
  "Never invent facts, statistics, prices, dates, results, testimonials, member counts or links.",
  "Never promise income, profits or returns, and never give financial, medical or legal guarantees.",
  "Keep it under 600 characters unless the member's text is longer. At most 2 relevant hashtags, at most 2 emoji.",
  "Return only the post text.",
].join(" ");

export function buildPostAssistPrompt(input: {
  action: PostAssistAction;
  text: string;
  topic: string;
  communityName?: string | null;
}): { instructions: string; input: string } {
  const where = input.communityName ? ` The post is for the community "${input.communityName}".` : "";
  const task =
    input.action === "draft"
      ? `Write a post about this idea from the member: ${input.topic || input.text}`
      : input.action === "improve"
        ? `Improve this post: fix grammar, make it clearer and more engaging, keep the meaning and every fact unchanged.\n\n${input.text}`
        : `Make this post shorter (about half) and keep its meaning and every fact unchanged.\n\n${input.text}`;
  return { instructions: RULES + where, input: task };
}
