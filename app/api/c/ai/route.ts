import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import {
  formatCommunityAiContext,
  loadCommunityAiContext,
} from "@/lib/community/ai-context";

export const dynamic = "force-dynamic";

type AiMode = "ask" | "summarize" | "suggest";

const MODE_HINTS: Record<AiMode, string> = {
  ask: "Answer the member's question helpfully using the community context when relevant.",
  summarize: "Summarize recent community activity and themes in 3–5 short bullets.",
  suggest: "Suggest 2–4 concrete next actions (posts, missions, or engagement ideas) for this community.",
};

function softFallback(prompt: string, mode: AiMode, communityName?: string): string {
  const place = communityName ? ` in ${communityName}` : "";
  if (mode === "summarize") {
    return [
      `Here's a quick read${place}:`,
      "• Recent posts show active discussion — reply to keep momentum.",
      "• Highlight one top post in your next digest.",
      "• Invite quieter members with a short mission or poll.",
    ].join("\n");
  }
  if (mode === "suggest") {
    return [
      `Ideas${place}:`,
      "1. Share a short clip or tip tied to your last popular post.",
      "2. Start a weekly mission with a clear point reward.",
      "3. Host a voice room during peak evening hours.",
      "4. Ask a question that invites replies in the feed.",
    ].join("\n");
  }
  const q = prompt.trim().slice(0, 120);
  return communityName
    ? `I'm offline from the AI provider right now, but for "${q}" in ${communityName}: check recent posts, spaces, and missions — your community context is the best source of truth.`
    : `I'm offline from the AI provider right now. Try rephrasing "${q}", or open a community to get context-aware tips.`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    communityId?: string;
    prompt?: string;
    mode?: AiMode;
  };

  const prompt = body.prompt?.trim() ?? "";
  if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  if (prompt.length > 2000) {
    return NextResponse.json({ error: "prompt too long" }, { status: 400 });
  }

  const mode: AiMode =
    body.mode === "summarize" || body.mode === "suggest" || body.mode === "ask"
      ? body.mode
      : "ask";

  let communityName: string | undefined;
  let contextBlock = "";

  if (body.communityId) {
    const { data: membership } = await supabase
      .from("community_memberships")
      .select("id")
      .eq("community_id", body.communityId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "No access" }, { status: 403 });
    }

    const ctx = await loadCommunityAiContext(body.communityId);
    if (ctx) {
      communityName = ctx.name;
      contextBlock = formatCommunityAiContext(ctx);
    }
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({
        text: softFallback(prompt, mode, communityName),
        fallback: true,
        mode,
      });
    }

    const client = new OpenAI({ apiKey });
    const system = [
      "You are Jimvio Community AI — a concise assistant for creators and members.",
      "Be practical, friendly, and brief. Use markdown sparingly (short bullets ok).",
      "Never invent private member data. If context is thin, say so and give general advice.",
      MODE_HINTS[mode],
    ].join(" ");

    const userContent = contextBlock
      ? `Community context:\n${contextBlock}\n\nMember request (${mode}):\n${prompt}`
      : `Member request (${mode}):\n${prompt}`;

    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      temperature: 0.6,
      max_tokens: 600,
    });

    const text =
      res.choices[0]?.message?.content?.trim() || softFallback(prompt, mode, communityName);

    return NextResponse.json({ text, mode });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI request failed";
    return NextResponse.json({
      text: softFallback(prompt, mode, communityName),
      fallback: true,
      warning: message,
      mode,
    });
  }
}
