import "server-only";
import { randomUUID } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { CHECKER_LABELS, emptyChecker, overallFrom, type CheckerResult, type ScanReport } from "./types";
import { checkLink } from "./check-links";
import { checkEngagement, socialPlatform } from "./check-engagement";
import { checkProduct } from "./check-product";
import { checkMedia } from "./check-media";
import { sha256, sniffType, type FileType } from "./file-inspect";
import { rememberFingerprints } from "./fingerprints";
import { readProductPage } from "./product-signals";

// Keep multipart requests below Vercel Functions' hard 4.5 MB body ceiling.
// The 90 KB envelope leaves room for multipart boundaries and headers.
export const MAX_UPLOAD_BYTES = Math.floor(4.2 * 1024 * 1024);

export type ScanRequest = {
  url: string | null;
  file: { buf: Buffer; name: string } | null;
  userId: string | null;
  requesterHash: string;
};

const PRODUCT_KINDS = new Set(["pdf", "office", "ebook", "archive", "executable", "text", "unknown"]);
const MEDIA_KINDS = new Set(["image", "video", "audio"]);

function safeName(name: string): string {
  return name.replace(/[\\/]+/g, "_").replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 120) || "file";
}

/** One scan: decides which checks apply, runs them, stores the report. */
export async function runScan(req: ScanRequest): Promise<ScanReport> {
  const started = Date.now();
  const id = randomUUID();
  const checkers: Partial<Record<keyof typeof CHECKER_LABELS, CheckerResult>> = {};

  let fileInfo: { buf: Buffer; name: string; type: FileType; sha: string } | null = null;
  if (req.file) {
    const name = safeName(req.file.name);
    fileInfo = { buf: req.file.buf, name, type: sniffType(req.file.buf, name), sha: sha256(req.file.buf) };
  }

  // 1. Links (+ the safely fetched page used by the other checks).
  let link: Awaited<ReturnType<typeof checkLink>> | null = null;
  if (req.url) {
    link = await checkLink(req.url);
    checkers.links = link.result;
  } else {
    checkers.links = emptyChecker("links", "Paste a link to check it for scams, phishing and malware.");
  }
  const ctx = link?.context ?? null;
  const finalUrl = ctx?.chain.final ? new URL(ctx.chain.final.url) : (ctx?.url ?? null);

  const ctx = link?.context ?? null;
  const finalUrl = ctx?.chain.final ? new URL(ctx.chain.final.url) : (ctx?.url ?? null);

  // URL-only submissions run only Scam & Malicious Link Detection.
  // Other verification tools remain available for uploaded files.
  if (!fileInfo) {
    checkers.engagement = emptyChecker("engagement", "Not run: this scan is focused on Scam & Malicious Link Detection.");
    checkers.product = emptyChecker("product", "Not run: this scan is focused on Scam & Malicious Link Detection.");
    checkers.media = emptyChecker("media", "Not run: this scan is focused on Scam & Malicious Link Detection.");
  } else {
    // 2. Engagement.
    checkers.engagement = await checkEngagement(ctx?.url ?? null, req.userId);
  
    // 3. Digital product.
    const pageIsProduct = Boolean(ctx?.html && readProductPage(ctx.html).isProduct && !socialPlatform(ctx.url));
    const fileIsProduct = Boolean(fileInfo && PRODUCT_KINDS.has(fileInfo.type.kind));
    checkers.product =
      fileIsProduct || pageIsProduct
        ? await checkProduct(
            {
              file: fileIsProduct ? fileInfo : null,
              page: pageIsProduct && ctx?.html && finalUrl ? { url: finalUrl, html: ctx.html, domainAgeDays: ctx.domainAgeDays } : null,
            },
            "",
          )
        : emptyChecker("product", "Upload an ebook, template, course file or software, or paste a product page, to verify a digital product.");
  
    // 4. Media: uploaded media, or media served directly at the link.
    let mediaInput: Parameters<typeof checkMedia>[0] = null;
    if (fileInfo && MEDIA_KINDS.has(fileInfo.type.kind)) {
      mediaInput = { buf: fileInfo.buf, name: fileInfo.name, type: fileInfo.type, origin: "upload" };
    } else if (ctx?.chain.final && /^(image|video|audio)\//i.test(ctx.contentType) && !ctx.chain.final.truncated) {
      const t = sniffType(ctx.chain.final.body, finalUrl?.pathname ?? "");
      if (MEDIA_KINDS.has(t.kind)) mediaInput = { buf: ctx.chain.final.body, name: finalUrl?.pathname ?? "media", type: t, origin: "url" };
    }
    const mediaReason = ctx && socialPlatform(ctx.url)
      ? "Upload the image, video or audio file itself: platforms don't let anyone download the original from a post link."
      : ctx?.chain.final?.truncated && /^(image|video|audio)\//i.test(ctx.contentType)
        ? "The media at this link is too large to fetch. Upload the file instead (up to 4.2 MiB)."
        : "Upload an image, video or audio file to check for AI generation, edits, provenance and reuse.";
    const media = await checkMedia(mediaInput, mediaReason);
    checkers.media = media.result;
  
  }

  // A social post or channel is mainly an engagement question: show that first.
  const isSocial = Boolean(ctx && socialPlatform(ctx.url));
  const order = isSocial ? (["engagement", "links", "media", "product"] as const) : (["links", "engagement", "product", "media"] as const);
  const ordered = order.map((k) => checkers[k]!);
  const report: ScanReport = {
    id,
    createdAt: new Date().toISOString(),
    status: "complete",
    input: {
      url: req.url,
      file: fileInfo ? { name: fileInfo.name, size: fileInfo.buf.length, type: fileInfo.type.label, sha256: fileInfo.sha } : null,
    },
    overall: overallFrom(ordered),
    checkers: ordered,
    durationMs: Date.now() - started,
  };

  const db = createServiceRoleClient() as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { error: saveError } = await db.from("trust_scans").insert({
    id,
    user_id: req.userId,
    requester_hash: req.requesterHash,
    input_url: req.url,
    file_name: fileInfo?.name ?? null,
    file_type: fileInfo?.type.label ?? null,
    file_size: fileInfo?.buf.length ?? null,
    file_sha256: fileInfo?.sha ?? null,
    status: "complete",
    overall_level: report.overall.level,
    report,
    duration_ms: report.durationMs,
  });
  if (saveError) throw new Error("The scan completed but its report could not be saved. Please try again.");
  const prints: { kind: "sha256" | "dhash"; value: string }[] = [];
  if (fileInfo) prints.push({ kind: "sha256", value: fileInfo.sha });
  if (media.dhash) prints.push({ kind: "dhash", value: media.dhash });
  if (prints.length) await rememberFingerprints(id, prints).catch(() => undefined);
  return report;
}
