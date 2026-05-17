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
    } catch {
    }
    return p.productName ?? "Untitled product";
}

const BRAND_PLACEHOLDERS = [
    /\[BRAND\s*NAME\]/gi,
    /\[BRAND\]/gi,
    /\[YOUR\s*BRAND\]/gi,
    /\[INSERT\s*BRAND\s*NAME\]/gi,
];

export function cleanCJDescription(remark: string | null | undefined): string {
    if (!remark) return "";

    let html = remark;

    html = html.replace(/<img\b[^>]*\/?>/gi, "");

    for (const re of BRAND_PLACEHOLDERS) {
        html = html.replace(new RegExp(`(?:the\\s+)?${re.source}`, re.flags), "");
    }

    html = html.replace(/^\s*(?:<br\s*\/?>\s*)+/gi, "");
    html = html.replace(/(?:<br\s*\/?>\s*)+\s*$/gi, "");

    html = html.replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br><br>");

    html = html.replace(/\s{2,}/g, " ");

    return html.trim();
}

export interface ParsedSpec {
    key: string;
    value: string;
}

export function parseCJSpecifications(
    remark: string | null | undefined
): { specs: ParsedSpec[]; notes: string[] } {
    if (!remark) return { specs: [], notes: [] };

    const section = remark.match(
        /<h3[^>]*>\s*Specifications?:?\s*<\/h3>\s*<ul[^>]*>([\s\S]*?)<\/ul>/i
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
        if (noteMatch) {
            notes.push(noteMatch[1].trim());
            continue;
        }

        const kvMatch = text.match(/^([^:]+):\s*(.+)$/);
        if (kvMatch) {
            specs.push({
                key: kvMatch[1].trim(),
                value: kvMatch[2].trim(),
            });
        } else {
            notes.push(text);
        }
    }

    return { specs, notes };
}

export function formatCJWeight(grams: number | string | null | undefined): string {
    const g = typeof grams === "string" ? parseFloat(grams) : grams;
    if (!g || !Number.isFinite(g) || g <= 0) return "";
    if (g < 1000) return `${Math.round(g)} g`;
    return `${(g / 1000).toFixed(g < 10000 ? 2 : 1)} kg`;
}

export function parseCJCategoryPath(categoryName: string | null | undefined): string[] {
    if (!categoryName) return [];
    return categoryName
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean);
}