export const CONTACT_TOPICS = [
  { value: "general", label: "General inquiry" },
  { value: "support", label: "Customer support" },
  { value: "business", label: "Business inquiry" },
  { value: "partnerships", label: "Partnership inquiry" },
  { value: "creator", label: "Creator inquiry" },
  { value: "vendor", label: "Vendor / seller inquiry" },
  { value: "press", label: "Press / media inquiry" },
  { value: "investors", label: "Investor inquiry" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

export function normalizeContactTopic(raw: string | null | undefined): ContactTopic {
  const match = CONTACT_TOPICS.find((t) => t.value === raw);
  return match?.value ?? "general";
}

export function isContactTopic(value: unknown): value is ContactTopic {
  return typeof value === "string" && CONTACT_TOPICS.some((t) => t.value === value);
}
