import { cleanCJDescription } from "@/lib/cj/render";
import { htmlToReadablePlainText } from "@/lib/htmlToPlainText";

/** Pull image URLs from HTML description (e.g. CJ remark). */
export function extractImagesFromHtml(html: string): string[] {
    const regex = /src=["']([^"']+)["']/gi;
    const urls: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
        const url = match[1];
        if (url.startsWith("http")) urls.push(url);
    }
    return urls;
}

export function isHtmlContent(text: string): boolean {
    return /<[a-z][\s\S]*>/i.test(text);
}

export function mergeUniqueUrls(existing: string[], incoming: string[], max = 20): string[] {
    const seen = new Set(existing);
    const merged = [...existing];
    for (const url of incoming) {
        if (!url.startsWith("http") || seen.has(url)) continue;
        seen.add(url);
        merged.push(url);
        if (merged.length >= max) break;
    }
    return merged;
}

export function deriveShortDescription(description: string, maxLen = 80): string {
    if (!description.trim()) return "";
    const plain = htmlToReadablePlainText(cleanCJDescription(description));
    if (plain.length <= maxLen) return plain;
    return `${plain.slice(0, maxLen).trim()}…`;
}

export function getProductPreviewImage(images: string[], description: string): string | null {
    if (images[0]) return images[0];
    return extractImagesFromHtml(description)[0] ?? null;
}
