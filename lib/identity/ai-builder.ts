/**
 * AI Universal Profile Builder helpers.
 * Draft-only: never invent employment, education, credentials, or stats.
 */

import { z } from "zod";

export const BIO_MODES = ["generate", "improve", "professional", "concise", "detailed"] as const;
export type BioAssistMode = (typeof BIO_MODES)[number];

export const profileBuilderDraftSchema = z.object({
  headline: z.string().max(160).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  skills: z.array(z.string().max(60)).max(30).optional(),
  languages: z.array(z.string().max(40)).max(20).optional(),
  industries: z.array(z.string().max(60)).max(20).optional(),
  experience: z
    .array(
      z.object({
        title: z.string().max(120),
        organization: z.string().max(120).nullable().optional(),
        description: z.string().max(2000).nullable().optional(),
        startedOn: z.string().max(32).nullable().optional(),
        endedOn: z.string().max(32).nullable().optional(),
        isCurrent: z.boolean().optional(),
      }),
    )
    .max(20)
    .optional(),
  education: z
    .array(
      z.object({
        title: z.string().max(120),
        organization: z.string().max(120).nullable().optional(),
        description: z.string().max(2000).nullable().optional(),
        startedOn: z.string().max(32).nullable().optional(),
        endedOn: z.string().max(32).nullable().optional(),
      }),
    )
    .max(20)
    .optional(),
  notes: z.array(z.string().max(240)).max(20).optional(),
});

export type ProfileBuilderDraft = z.infer<typeof profileBuilderDraftSchema>;

export function bioAssistInstructions(mode: BioAssistMode): string {
  const base =
    "You write professional Jimvio Identity biographies. Use ONLY facts provided by the user. " +
    "Never invent employers, schools, credentials, awards, metrics, audience size, or verification. " +
    "If information is missing, write around it without fabricating. Return plain text only.";

  switch (mode) {
    case "generate":
      return `${base} Draft a clear first-person professional summary from the supplied profile facts.`;
    case "improve":
      return `${base} Improve clarity, grammar, and flow while preserving meaning and every fact.`;
    case "professional":
      return `${base} Rewrite in a polished professional tone for brands and collaborators.`;
    case "concise":
      return `${base} Produce a concise version under 400 characters when possible.`;
    case "detailed":
      return `${base} Produce a detailed but factual professional summary.`;
    default:
      return base;
  }
}

export function profileBuilderInstructions(): string {
  return (
    "You extract and organize Jimvio Identity profile drafts from user-supplied text only. " +
    "Never invent jobs, schools, certificates, companies, projects, awards, or numbers. " +
    "If a field is not explicitly supported by the input, omit it or set it null. " +
    "Mark uncertain items in notes as needing confirmation. " +
    "Return JSON matching the schema. Do not wrap in markdown."
  );
}

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Could not parse AI draft JSON");
  }
}
