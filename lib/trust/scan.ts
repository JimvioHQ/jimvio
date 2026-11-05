import "server-only";
import { randomUUID } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { emptyChecker, overallFrom, type CheckerId, type CheckerResult, type ScanReport } from "./types";
import { normalizeUrl } from "./safe-fetch";
import { categoryFor } from "./category";
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

function safeName(name: string): string {
  return name.replace(/[\\/]+/g, "_").replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 120) || "file";
}

const NOT_RUN: Record<CheckerId, string> = {
  links: "Not part of this check.",
  engagement: "Not part of this check.",
  product: "Not part of this check.",
  media: "Not part of this check.",
};

/** One scan: decides the single category that applies, runs only that, stores the report. */
export async function runScan(req: ScanRequest): Promise<ScanReport> {
  const started = Date.now();
  const id = randomUUID();

  let fileInfo: { buf: Buffer; name: string; type: FileType; sha: string } | null = null;
  if (req.file) {
    const name = safeName(req.file.name);
    fileInfo = { buf: req.file.buf, name, type: sniffType(req.file.buf, name), sha: sha256(req.file.buf) };
  }

  let parsedUrl: URL | null = null;
  if (req.url) {
    try {
      parsedUrl = normalizeUrl(req.url);
    } catch {
      parsedUrl = null;
    }
  }
  const social = Boolean(parsedUrl && socialPlatform(parsedUrl));
  let category = categoryFor({ fileKind: fileInfo?.type.kind ?? null, social });
  let primary: CheckerResult;
  let dhash: string | null = null;
  let unsupportedReason: string | undefined;

  if (category === "unsupported") {
    unsupportedReason = `Jimvio couldn't recognize this file's format from its contents${fileInfo ? ` (“${fileInfo.name}”)` : ""}. Supported files: images (JPG, PNG, WebP, GIF, HEIC), videos (MP4, MOV, WebM), audio, PDF, EPUB, Word, Excel, PowerPoint, ZIP and text.`;
    primary = { ...emptyChecker("product", unsupportedReason), status: "inconclusive" };
  } else if (category === "media" && fileInfo) {
    const media = await checkMedia({ buf: fileInfo.buf, name: fileInfo.name, type: fileInfo.type, origin: "upload" }, "");
    primary = media.result;
    dhash = media.dhash;
  } else if (category === "product" && fileInfo) {
    // A product page link given with the file adds seller evidence.
    let page: Parameters<typeof checkProduct>[0]["page"] = null;
    if (req.url && parsedUrl && !social) {
      const link = await checkLink(req.url);
      const ctx = link.context;
      const finalUrl = ctx?.chain.final ? new URL(ctx.chain.final.url) : (ctx?.url ?? null);
      if (ctx?.html && finalUrl && readProductPage(ctx.html).isProduct) page = { url: finalUrl, html: ctx.html, domainAgeDays: ctx.domainAgeDays };
    }
    primary = await checkProduct({ file: fileInfo, page }, "");
  } else if (category === "engagement" && parsedUrl) {
    primary = await checkEngagement(parsedUrl, req.userId);
  } else {
    const link = await checkLink(req.url ?? "");
    primary = link.result;
    const ctx = link.context;
    const final = ctx?.chain.final;
    if (final && !final.truncated && /^(image|video|audio)\/|application\/(pdf|epub)/i.test(ctx.contentType)) {
      const finalUrl = new URL(final.url);
      const t = sniffType(final.body, finalUrl.pathname);
      const served = categoryFor({ fileKind: null, social: false, servedKind: t.kind });
      const name = safeName(decodeURIComponent(finalUrl.pathname.split("/").pop() || "download"));
      if (served === "media") {
        const media = await checkMedia({ buf: final.body, name, type: t, origin: "url" }, "");
        primary = media.result;
        dhash = media.dhash;
        category = "media";
      } else if (served === "product") {
        fileInfo = { buf: final.body, name, type: t, sha: sha256(final.body) };
        primary = await checkProduct({ file: fileInfo, page: null }, "");
        category = "product";
      }
    }
  }

  const checkers = [primary, ...(["links", "engagement", "product", "media"] as const).filter((k) => k !== primary.id).map((k) => emptyChecker(k, NOT_RUN[k]))];
  const report: ScanReport = {
    id,
    createdAt: new Date().toISOString(),
    status: "complete",
    input: {
      url: req.url,
      file: fileInfo ? { name: fileInfo.name, size: fileInfo.buf.length, type: fileInfo.type.label, sha256: fileInfo.sha } : null,
    },
    category,
    ...(unsupportedReason ? { unsupportedReason } : {}),
    overall: overallFrom([primary]),
    checkers,
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
  if (dhash) prints.push({ kind: "dhash", value: dhash });
  if (prints.length) await rememberFingerprints(id, prints).catch(() => undefined);
  return report;
}
