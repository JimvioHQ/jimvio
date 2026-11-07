import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { rateLimit } from "@/lib/ops/rate-limit";
import { completePrimaryText } from "@/lib/ai/text-generation";
import { readOpenAIKey } from "@/lib/ai/openai-runtime";
import { isConfidentialAiRequest } from "@/lib/ai/ai-guard";
import { BIO_MODES, bioAssistInstructions, type BioAssistMode } from "@/lib/identity/ai-builder";
import { getIdentityByUserId } from "@/lib/identity/resolve";

export const dynamic = "force-dynamic";

/**
 * POST /api/identity/ai/bio
 * Draft-only biography assistance. Never auto-saves to the public profile.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const limited = rateLimit(`identity-ai-bio:${user.id}`, 12, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many AI requests. Try again shortly." }, { status: 429 });
  }

  const apiKey = readOpenAIKey();
  if (!apiKey) {
    return NextResponse.json({ error: "AI writing is not configured right now." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const mode = (BIO_MODES.includes(body.mode) ? body.mode : "improve") as BioAssistMode;
  const currentBio = typeof body.bio === "string" ? body.bio.trim() : "";
  const language = typeof body.language === "string" ? body.language.trim().slice(0, 40) : "";

  if (isConfidentialAiRequest(`${currentBio}\n${language}`)) {
    return NextResponse.json({ error: "That request cannot be processed." }, { status: 400 });
  }

  const payload = await getIdentityByUserId(user.id, user.id);
  if (!payload) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const profile = payload.profile;

  const facts = [
    `Display name: ${profile.fullName || "n/a"}`,
    `Headline: ${profile.headline || "n/a"}`,
    `City/Country: ${[profile.city, profile.country].filter(Boolean).join(", ") || "n/a"}`,
    `Skills: ${(profile.skills ?? []).join(", ") || "n/a"}`,
    `Languages: ${(profile.languages ?? []).join(", ") || "n/a"}`,
    `Industries: ${(profile.industries ?? []).join(", ") || "n/a"}`,
    `Current bio: ${currentBio || profile.bio || "(empty)"}`,
    language ? `Preferred output language: ${language}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const draft = await completePrimaryText({
      apiKey,
      instructions: bioAssistInstructions(mode),
      input: facts,
      temperature: 0.4,
      maxOutputTokens: 700,
      geminiFallback: true,
    });
    return NextResponse.json({
      draft: draft.trim(),
      mode,
      notice: "Draft only. Review and approve before saving to your public profile.",
    });
  } catch (err) {
    console.error("POST /api/identity/ai/bio failed", err);
    return NextResponse.json({ error: "AI could not generate a draft right now." }, { status: 502 });
  }
}
