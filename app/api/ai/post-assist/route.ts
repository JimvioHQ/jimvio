import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ops/rate-limit";
import { readOpenAIKey, resolveOpenAIModel } from "@/lib/ai/openai-runtime";
import { completePrimaryText } from "@/lib/ai/text-generation";
import { isConfidentialAiRequest, CONFIDENTIAL_AI_REFUSAL } from "@/lib/ai/ai-guard";
import { sanitizeAiUserPrompt } from "@/lib/community/ai-context";
import { buildPostAssistPrompt, parsePostAssistAction } from "@/lib/ai/post-assist";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** POST — AI writing help for the post composer (draft / improve / shorten). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to use AI Assist" }, { status: 401 });

  const limited = rateLimit(`post-assist:${user.id}`, 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many AI requests — try again in a minute" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    action?: string;
    text?: string;
    topic?: string;
    communityName?: string;
  } | null;
  const action = parsePostAssistAction(body?.action);
  const text = sanitizeAiUserPrompt(body?.text ?? "", 5000);
  const topic = sanitizeAiUserPrompt(body?.topic ?? "", 500);
  const communityName = sanitizeAiUserPrompt(body?.communityName ?? "", 80) || null;
  if (!action) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  if (action === "draft" ? !(topic || text) : !text) {
    return NextResponse.json(
      { error: action === "draft" ? "Tell AI what the post is about" : "Write something first" },
      { status: 400 },
    );
  }
  if (isConfidentialAiRequest(`${topic}\n${text}`)) {
    return NextResponse.json({ error: CONFIDENTIAL_AI_REFUSAL }, { status: 400 });
  }

  const apiKey = readOpenAIKey();
  if (!apiKey) {
    return NextResponse.json({ error: "AI Assist is temporarily unavailable" }, { status: 503 });
  }

  const prompt = buildPostAssistPrompt({ action, text, topic, communityName });
  try {
    const out = await completePrimaryText({
      apiKey,
      model: resolveOpenAIModel().model,
      instructions: prompt.instructions,
      input: prompt.input,
      temperature: action === "draft" ? 0.7 : 0.4,
      maxOutputTokens: 500,
      timeoutMs: 20_000,
    });
    const clean = out.replace(/^["“]|["”]$/g, "").trim().slice(0, 5000);
    return NextResponse.json({ text: clean });
  } catch (err) {
    console.error("[post-assist] provider error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "AI Assist is busy — please try again" }, { status: 502 });
  }
}
