import { NextRequest, NextResponse } from "next/server";
import { MAX_UPLOAD_BYTES, runScan } from "@/lib/trust/scan";
import { currentRequester, withinHourlyLimit } from "@/lib/trust/requester";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/trust-checker/scan — multipart form: url (optional), file (optional).
 * Open to everyone, including people without a Jimvio account (rate limited).
 * Uploaded files are processed in memory and never stored; only fingerprints are kept.
 */
export async function POST(req: NextRequest) {
  const requester = await currentRequester(req.headers);
  let allowed: boolean;
  try {
    allowed = await withinHourlyLimit(requester);
  } catch {
    return NextResponse.json({ error: "Trust Checker is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
  if (!allowed) {
    return NextResponse.json(
      { error: requester.userId ? "You've run many checks this hour. Try again later." : "Free checks are limited per hour. Sign in to Jimvio for more." },
      { status: 429 },
    );
  }
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_UPLOAD_BYTES + 90_000) return NextResponse.json({ error: "Files can be up to 4.2 MiB." }, { status: 413 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Send a link, a file, or both." }, { status: 400 });
  }
  const url = typeof form.get("url") === "string" ? String(form.get("url")).trim().slice(0, 2048) : "";
  const fileEntry = form.get("file");
  let file: { buf: Buffer; name: string } | null = null;
  if (fileEntry && typeof fileEntry === "object" && "arrayBuffer" in fileEntry) {
    const blob = fileEntry as File;
    if (blob.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Files can be up to 4.2 MiB." }, { status: 413 });
    if (blob.size > 0) file = { buf: Buffer.from(await blob.arrayBuffer()), name: blob.name || "file" };
  }
  if (!url && !file) return NextResponse.json({ error: "Paste a link or choose a file." }, { status: 400 });

  try {
    const report = await runScan({ url: url || null, file, userId: requester.userId, requesterHash: requester.hash });
    return NextResponse.json({ report });
  } catch (err) {
    console.error("[trust-checker] scan failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The check failed before finishing. Nothing was saved as safe — please try again." }, { status: 500 });
  }
}
