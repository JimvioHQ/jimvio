// export function getCJTitle(p: {
//     productNameEn?: string | null;
//     productName?: string | null;
// }): string {
//     if (p.productNameEn && p.productNameEn.trim().length > 0) {
//         return p.productNameEn.trim();
//     }
//     try {
//         const tags = JSON.parse(p.productName ?? "[]");
//         if (Array.isArray(tags)) {
//             return tags.map((t) => String(t).trim()).filter(Boolean).join(" ");
//         }
//     } catch {
//     }
//     return p.productName ?? "Untitled product";
// }

// const BRAND_PLACEHOLDERS = [
//     /\[BRAND\s*NAME\]/gi,
//     /\[BRAND\]/gi,
//     /\[YOUR\s*BRAND\]/gi,
//     /\[INSERT\s*BRAND\s*NAME\]/gi,
// ];

// export function cleanCJDescription(remark: string | null | undefined): string {
//     if (!remark) return "";

//     let html = remark;

//     html = html.replace(/<img\b[^>]*\/?>/gi, "");

//     for (const re of BRAND_PLACEHOLDERS) {
//         html = html.replace(new RegExp(`(?:the\\s+)?${re.source}`, re.flags), "");
//     }

//     html = html.replace(/^\s*(?:<br\s*\/?>\s*)+/gi, "");
//     html = html.replace(/(?:<br\s*\/?>\s*)+\s*$/gi, "");

//     html = html.replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br><br>");

//     html = html.replace(/\s{2,}/g, " ");

//     return html.trim();
// }

// export interface ParsedSpec {
//     key: string;
//     value: string;
// }

// export function parseCJSpecifications(
//     remark: string | null | undefined
// ): { specs: ParsedSpec[]; notes: string[] } {
//     if (!remark) return { specs: [], notes: [] };

//     const section = remark.match(
//         /<h3[^>]*>\s*Specifications?:?\s*<\/h3>\s*<ul[^>]*>([\s\S]*?)<\/ul>/i
//     );
//     if (!section) return { specs: [], notes: [] };

//     const liMatches = section[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);

//     const specs: ParsedSpec[] = [];
//     const notes: string[] = [];

//     for (const m of liMatches) {
//         const text = m[1]
//             .replace(/<[^>]+>/g, "")
//             .replace(/^\s*[-–—]\s*/, "")
//             .trim();

//         if (!text) continue;

//         const noteMatch = text.match(/^NOTE:\s*(.+)$/i);
//         if (noteMatch) {
//             notes.push(noteMatch[1].trim());
//             continue;
//         }

//         const kvMatch = text.match(/^([^:]+):\s*(.+)$/);
//         if (kvMatch) {
//             specs.push({
//                 key: kvMatch[1].trim(),
//                 value: kvMatch[2].trim(),
//             });
//         } else {
//             notes.push(text);
//         }
//     }

//     return { specs, notes };
// }

// export function formatCJWeight(grams: number | string | null | undefined): string {
//     const g = typeof grams === "string" ? parseFloat(grams) : grams;
//     if (!g || !Number.isFinite(g) || g <= 0) return "";
//     if (g < 1000) return `${Math.round(g)} g`;
//     return `${(g / 1000).toFixed(g < 10000 ? 2 : 1)} kg`;
// }

// export function parseCJCategoryPath(categoryName: string | null | undefined): string[] {
//     if (!categoryName) return [];
//     return categoryName
//         .split("/")
//         .map((s) => s.trim())
//         .filter(Boolean);
// }

// lib/cj/render.ts — enhanced with multi-format CJ description parsing

// ─── Title ────────────────────────────────────────────────────────────────────

export function getCJTitle(p: {
  productNameEn?: string | null;
  productName?: string | null;
}): string {
  if (p.productNameEn && p.productNameEn.trim().length > 0) {
    return p.productNameEn.trim();
  }
  try {
    const tags = JSON.parse(p.productName ?? "[]");
    if (Array.isArray(tags)) {
      return tags.map((t) => String(t).trim()).filter(Boolean).join(" ");
    }
  } catch {}
  return p.productName ?? "Untitled product";
}

// ─── Clean ────────────────────────────────────────────────────────────────────

const BRAND_PLACEHOLDERS = [
  /\[BRAND\s*NAME\]/gi,
  /\[BRAND\]/gi,
  /\[YOUR\s*BRAND\]/gi,
  /\[INSERT\s*BRAND\s*NAME\]/gi,
];

export function cleanCJDescription(remark: string | null | undefined): string {
  if (!remark) return "";

  let html = remark;

  // Remove images
  html = html.replace(/<img\b[^>]*\/?>/gi, "");

  // Remove brand placeholders
  for (const re of BRAND_PLACEHOLDERS) {
    html = html.replace(new RegExp(`(?:the\\s+)?${re.source}`, re.flags), "");
  }

  // Strip leading / trailing <br>
  html = html.replace(/^\s*(?:<br\s*\/?>\s*)+/gi, "");
  html = html.replace(/(?:<br\s*\/?>\s*)+\s*$/gi, "");

  // Collapse 3+ consecutive <br>
  html = html.replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br><br>");

  // Normalise whitespace
  html = html.replace(/\s{2,}/g, " ");

  return html.trim();
}

// ─── Structured description types ────────────────────────────────────────────

export interface ParsedSpec {
  key: string;
  value: string;
}

export interface CJFeatureHighlight {
  title: string;
  description: string;
}

export interface CJUsageCommand {
  command: string;   // e.g. "000"
  description: string;
}

export interface CJDescriptionSections {
  /** Key–value spec rows */
  specs: ParsedSpec[];
  /** [Title] Description feature highlights */
  features: CJFeatureHighlight[];
  /** Send <cmd> → <description> usage commands */
  commands: CJUsageCommand[];
  /** Misc notes that don't fit a category (deduplicated) */
  notes: string[];
}

// ─── HTML list format (original parser, kept intact) ─────────────────────────

function parseHTMLListSpecs(html: string): { specs: ParsedSpec[]; notes: string[] } {
  const section = html.match(
    /<h3[^>]*>\s*Specifications?:?\s*<\/h3>\s*<ul[^>]*>([\s\S]*?)<\/ul>/i,
  );
  if (!section) return { specs: [], notes: [] };

  const liMatches = section[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  const specs: ParsedSpec[] = [];
  const notes: string[] = [];

  for (const m of liMatches) {
    const text = m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/^\s*[-–—]\s*/, "")
      .trim();

    if (!text) continue;

    const noteMatch = text.match(/^NOTE:\s*(.+)$/i);
    if (noteMatch) { notes.push(noteMatch[1].trim()); continue; }

    const kvMatch = text.match(/^([^:]+):\s*(.+)$/);
    if (kvMatch) {
      specs.push({ key: kvMatch[1].trim(), value: kvMatch[2].trim() });
    } else {
      notes.push(text);
    }
  }
  return { specs, notes };
}

// ─── Plain-text / asterisk format parser ─────────────────────────────────────

/**
 * Strips all HTML tags from a string and returns plain text.
 */
function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#[0-9]+;/g, " ");
}

/**
 * Deduplicates an array of strings (case-insensitive, trim).
 */
function dedup(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((s) => {
    const key = s.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Parses CJ descriptions that use asterisk bullets and [Title] feature blocks.
 *
 * Handles:
 *   [Feature Title] Description text
 *   Notizen: / Notes:  repeated text
 *   VERWENDUNG / USAGE  *Send 000 to ...
 *   Produktspezifikation / Product specifications  *Key: Value
 */
function parsePlainTextSections(plain: string): CJDescriptionSections {
  const features: CJFeatureHighlight[] = [];
  const specs: ParsedSpec[] = [];
  const commands: CJUsageCommand[] = [];
  const rawNotes: string[] = [];

  // ── Split into labelled sections first ──────────────────────────────────
  // Detect section headers: all-caps words like VERWENDUNG, USAGE, or
  // localised headers ending in ":"
  const SPEC_SECTION_RE =
    /(?:Produktspezifikation|Product\s*[Ss]pecifications?|Spezifikation|[Ss]pecifications?)\s*[:\n]/i;
  const USAGE_SECTION_RE =
    /(?:VERWENDUNG|USAGE|ANLEITUNG|HOW\s*TO\s*USE)\s*[:\n*]?/i;
  const NOTES_SECTION_RE =
    /(?:Notizen?|Notes?|Hinweis[e]?|Important[:\s])\s*[:\n]/i;

  // Walk line by line
  const lines = plain.split("\n").map((l) => l.trim()).filter(Boolean);

  type Mode = "default" | "specs" | "usage" | "notes";
  let mode: Mode = "default";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── Mode switches ──────────────────────────────────────────────────────
    if (SPEC_SECTION_RE.test(line)) { mode = "specs"; continue; }
    if (USAGE_SECTION_RE.test(line)) { mode = "usage"; continue; }
    if (NOTES_SECTION_RE.test(line)) { mode = "notes"; continue; }

    // ── Feature highlights:  [Title] description ──────────────────────────
    const featureMatch = line.match(/^\[([^\]]+)\]\s*(.*)/);
    if (featureMatch) {
      mode = "default";
      const title = featureMatch[1].trim();
      let desc = featureMatch[2].trim();
      // Collect continuation lines until next [Feature] or section header
      while (
        i + 1 < lines.length &&
        !lines[i + 1].startsWith("[") &&
        !SPEC_SECTION_RE.test(lines[i + 1]) &&
        !USAGE_SECTION_RE.test(lines[i + 1]) &&
        !lines[i + 1].startsWith("*")
      ) {
        i++;
        desc += " " + lines[i].trim();
      }
      features.push({ title, description: desc.trim() });
      continue;
    }

    // ── Asterisk bullets ──────────────────────────────────────────────────
    if (line.startsWith("*")) {
      const content = line.replace(/^\*+\s*/, "").trim();
      if (!content) continue;

      if (mode === "specs") {
        const kv = content.match(/^([^:*]+):\s*(.+)$/);
        if (kv) {
          specs.push({ key: kv[1].trim(), value: kv[2].trim() });
        } else {
          rawNotes.push(content);
        }
        continue;
      }

      if (mode === "usage") {
        // "Send 000 to connect..." or "Senden Sie 000, um..."
        const cmdMatch = content.match(
          /(?:[Ss]end(?:en\s+[Ss]ie)?\s+(\w+)[,\s]|^(\w+)[,\s])/,
        );
        if (cmdMatch) {
          const command = (cmdMatch[1] || cmdMatch[2]).trim();
          const description = content
            .replace(/^[Ss]end(?:en\s+[Ss]ie)?\s+\w+[,\s]+(?:um\s+)?/i, "")
            .replace(/^[Ss]end\s+\w+[,\s]+/i, "")
            .replace(/\s+to\s+/, " → ")
            .trim();
          commands.push({ command, description });
        } else {
          rawNotes.push(content);
        }
        continue;
      }

      if (mode === "notes") {
        rawNotes.push(content);
        continue;
      }

      // default mode: try kv, else note
      const kv = content.match(/^([^:*]+):\s*(.+)$/);
      if (kv) {
        specs.push({ key: kv[1].trim(), value: kv[2].trim() });
      } else {
        rawNotes.push(content);
      }
      continue;
    }

    // ── Notes section plain lines ─────────────────────────────────────────
    if (mode === "notes") {
      rawNotes.push(line);
    }
  }

  return {
    specs,
    features,
    commands,
    notes: dedup(rawNotes),
  };
}

// ─── Public unified parser ────────────────────────────────────────────────────

/**
 * Parses a CJ product description (HTML or plain text) into structured sections.
 * Handles both the HTML-list format and the asterisk/bracket plain-text format.
 */
export function parseCJDescriptionSections(
  remark: string | null | undefined,
): CJDescriptionSections {
  if (!remark) return { specs: [], features: [], commands: [], notes: [] };

  // Try HTML list format first (original)
  const htmlResult = parseHTMLListSpecs(remark);
  if (htmlResult.specs.length > 0) {
    return { ...htmlResult, features: [], commands: [] };
  }

  // Fall back to plain-text parser
  const plain = stripTags(remark);
  return parsePlainTextSections(plain);
}

/**
 * Legacy export kept for backwards compatibility.
 * Prefer `parseCJDescriptionSections` for new code.
 */
export function parseCJSpecifications(
  remark: string | null | undefined,
): { specs: ParsedSpec[]; notes: string[] } {
  const result = parseCJDescriptionSections(remark);
  return { specs: result.specs, notes: result.notes };
}

// ─── Weight formatter ─────────────────────────────────────────────────────────

export function formatCJWeight(grams: number | string | null | undefined): string {
  const g = typeof grams === "string" ? parseFloat(grams) : grams;
  if (!g || !Number.isFinite(g) || g <= 0) return "";
  if (g < 1000) return `${Math.round(g)} g`;
  return `${(g / 1000).toFixed(g < 10000 ? 2 : 1)} kg`;
}

export function parseCJCategoryPath(categoryName: string | null | undefined): string[] {
  if (!categoryName) return [];
  return categoryName.split("/").map((s) => s.trim()).filter(Boolean);
}