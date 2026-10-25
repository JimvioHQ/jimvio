import { greetingReply, isSimpleGreeting, presentAssistantContent } from "@/lib/ai/guide-copy";
import { buildEarningGuideReply } from "@/lib/ai/earning-guide";
import { composePublicGuide } from "@/lib/ai/knowledge";

type GuideMessage = { content: string };

/**
 * Helpful reply used when the live model does not answer.
 * The body is public copy, not the model prompt.
 */
export function buildGuideResponse(messages: GuideMessage[]): string {
  const last = messages[messages.length - 1]?.content ?? "";
  if (isSimpleGreeting(last)) return greetingReply(last);
  const history = messages.slice(0, -1).map((item) => item.content);
  const earned = buildEarningGuideReply(last, history);
  const specificEarningPath = !earned.includes("Welcome to Jimvio AI");
  const body = specificEarningPath ? earned : composePublicGuide(last);
  return presentAssistantContent(body);
}
