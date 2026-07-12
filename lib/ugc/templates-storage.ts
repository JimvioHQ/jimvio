const KEY = "jimvio-ugc-templates";

export type UGCTemplate = {
  id: string;
  title: string;
  category: "hook" | "caption" | "script" | "description" | "cta" | "hashtags";
  body: string;
  favorite: boolean;
  createdAt: string;
};

const DEFAULTS: Omit<UGCTemplate, "id" | "createdAt" | "favorite">[] = [
  {
    title: "Problem → Solution hook",
    category: "hook",
    body: "I struggled with [problem] until I found [product]. Here's what changed…",
  },
  {
    title: "POV discovery",
    category: "hook",
    body: "POV: you finally found a brand that actually pays creators fairly.",
  },
  {
    title: "Short CTA caption",
    category: "caption",
    body: "Link in bio · Use code CREATOR for [discount]. #ad #partner",
  },
  {
    title: "30s UGC script",
    category: "script",
    body: "Hook (3s) → Problem (5s) → Demo (15s) → Result (5s) → CTA (2s)",
  },
  {
    title: "Brand mention CTA",
    category: "cta",
    body: "Shop now at [link] — mention this video for exclusive perks.",
  },
  {
    title: "Trending hashtag pack",
    category: "hashtags",
    body: "#fyp #ugc #creator #brandpartner #tiktokmademebuyit",
  },
];

function seed(): UGCTemplate[] {
  return DEFAULTS.map((t) => ({
    ...t,
    id: crypto.randomUUID(),
    favorite: false,
    createdAt: new Date().toISOString(),
  }));
}

export function getTemplates(): UGCTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const initial = seed();
      localStorage.setItem(KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as UGCTemplate[];
  } catch {
    return seed();
  }
}

export function saveTemplates(templates: UGCTemplate[]) {
  localStorage.setItem(KEY, JSON.stringify(templates));
}

export function toggleTemplateFavorite(id: string): UGCTemplate[] {
  const next = getTemplates().map((t) => (t.id === id ? { ...t, favorite: !t.favorite } : t));
  saveTemplates(next);
  return next;
}

export function addTemplate(
  input: Pick<UGCTemplate, "title" | "category" | "body">,
): UGCTemplate[] {
  const next = [
    {
      ...input,
      id: crypto.randomUUID(),
      favorite: false,
      createdAt: new Date().toISOString(),
    },
    ...getTemplates(),
  ];
  saveTemplates(next);
  return next;
}
