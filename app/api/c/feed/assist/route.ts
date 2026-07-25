import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ops/rate-limit";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

/**
 * Community Feed AI Assist — rewrite / expand / tone a post draft.
 * Body: { text: string, mode?: "improve" | "shorten" | "expand" | "engaging" }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`feed-assist:${user.id}`, 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many assist requests — try again shortly" },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    text?: string;
    mode?: "improve" | "shorten" | "expand" | "engaging";
  };

  const text = body.text?.trim() ?? "";
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
  if (text.length > 4000) {
    return NextResponse.json({ error: "text too long" }, { status: 400 });
  }

  const mode = body.mode ?? "improve";
  const modeHint: Record<string, string> = {
    improve: "Improve clarity and polish while keeping the author's voice.",
    shorten: "Make it concise — under 80 words — without losing the point.",
    expand: "Expand with helpful context and a clear call for discussion.",
    engaging: "Make it more engaging for a community feed; invite replies.",
  };

  const softFallback = () => {
    let suggestion = text.replace(/\s+/g, " ").trim();
    if (mode === "engaging" && !suggestion.includes("?")) {
      suggestion = `${suggestion}\n\nWhat do you think?`;
    }
    return suggestion;
  };

  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ text: softFallback(), fallback: true });
    }

    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You help community creators write excellent posts. Return ONLY the rewritten post text. No quotes or preamble.",
        },
        {
          role: "user",
          content: `${modeHint[mode] ?? modeHint.improve}\n\nDraft:\n${text}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const suggestion = res.choices[0]?.message?.content?.trim() || softFallback();
    return NextResponse.json({ text: suggestion });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI assist failed";
    return NextResponse.json({ text: softFallback(), fallback: true, warning: message });
  }
}
