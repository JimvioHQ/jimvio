import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/services/ops/audit";
import { rateLimit } from "@/lib/ops/rate-limit";
import {
  SITE_ICON_BUCKET,
  SITE_ICON_DEFINITIONS,
  SITE_ICON_MAX_BYTES,
  SITE_ICON_SETTING_KEY,
} from "@/lib/site-icons/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type IconAsset = { path: string; contentType: string; size: number; width: number; height: number; updatedAt: string };
type IconSettings = { assets: Record<string, IconAsset>; history: Record<string, IconAsset[]>; updatedAt: string };

async function renderVariant(source: Buffer, slot: string, filename: string, contentType: string, width: number, height: number) {
  const w = width || 512;
  const h = height || 512;

  if (contentType === "image/x-icon") {
    const sizes = [16, 32, 48];
    const frames = await Promise.all(sizes.map((size) =>
      sharp(source, { failOn: "error", limitInputPixels: 16_000_000 })
        .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    ));
    const directoryEnd = 6 + frames.length * 16;
    const output = Buffer.alloc(directoryEnd + frames.reduce((sum, frame) => sum + frame.length, 0));
    output.writeUInt16LE(0, 0);
    output.writeUInt16LE(1, 2);
    output.writeUInt16LE(frames.length, 4);
    let offset = directoryEnd;
    frames.forEach((frame, index) => {
      const entry = 6 + index * 16;
      output[entry] = sizes[index];
      output[entry + 1] = sizes[index];
      output.writeUInt16LE(1, entry + 4);
      output.writeUInt16LE(32, entry + 6);
      output.writeUInt32LE(frame.length, entry + 8);
      output.writeUInt32LE(offset, entry + 12);
      frame.copy(output, offset);
      offset += frame.length;
    });
    return { body: output, contentType: "image/x-icon", width: 48, height: 48 };
  }

  let pipeline = sharp(source, { failOn: "error", limitInputPixels: 16_000_000 })
    .resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });

  if (slot.includes("mono")) pipeline = pipeline.grayscale();
  const png = await pipeline.png().toBuffer();

  if (contentType === "image/svg+xml") {
    const encoded = png.toString("base64");
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><image width="' + w + '" height="' + h + '" xlink:href="data:image/png;base64,' + encoded + '"/></svg>',
      "utf8",
    );
    return { body: svg, contentType: "image/svg+xml", width: w, height: h };
  }
  return { body: png, contentType: "image/png", width: w, height: h };
}

export async function POST(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof assertPlatformAdmin>>;
  try {
    auth = await assertPlatformAdmin();
  } catch (error) {
    console.error("[admin/site-icons/main] authorization check failed", error);
    return NextResponse.json({ error: "Could not verify administrator access. Refresh and sign in again." }, { status: 503 });
  }
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Unauthorized" : "Forbidden" }, { status: auth.status });

  const limited = rateLimit("site-icon-main:" + auth.user.id, 5, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many changes. Try again shortly." }, { status: 429 });

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > SITE_ICON_MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Icon upload request is too large" }, { status: 413 });
  }

  const uploadedPaths: string[] = [];
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PNG image" }, { status: 400 });
    if (file.size <= 0 || file.size > SITE_ICON_MAX_BYTES) return NextResponse.json({ error: "Icon must be smaller than 1 MB" }, { status: 400 });

    const source = Buffer.from(await file.arrayBuffer());
    const sourceMeta = await sharp(source, { failOn: "error", limitInputPixels: 16_000_000 }).metadata();
    if (sourceMeta.format !== "png" || !sourceMeta.width || !sourceMeta.height || sourceMeta.width > 4096 || sourceMeta.height > 4096) {
      return NextResponse.json({ error: "Upload a valid PNG image no larger than 4096 × 4096 pixels. Other formats are not accepted." }, { status: 400 });
    }

    const targets = SITE_ICON_DEFINITIONS.filter((item) => item.group !== "Storefronts");
    const generated = await Promise.all(targets.map(async (item) => ({
      item,
      ...(await renderVariant(source, item.slot, item.filename, item.contentType, item.width, item.height)),
    })));

    const admin = createAdminClient();
    const { data: row, error: readError } = await admin.from("platform_settings").select("value").eq("key", SITE_ICON_SETTING_KEY).maybeSingle();
    if (readError) throw readError;
    const value = row?.value && typeof row.value === "object" ? row.value as Partial<IconSettings> : {};
    const settings: IconSettings = {
      assets: value.assets && typeof value.assets === "object" ? value.assets : {},
      history: value.history && typeof value.history === "object" ? value.history : {},
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
    };

    const now = new Date().toISOString();
    for (const entry of generated) {
      const extension = entry.item.filename.split(".").pop() || "png";
      const storagePath = "site-icons/" + entry.item.slot + "/" + Date.now() + "-" + randomUUID() + "." + extension;
      const { error: uploadError } = await admin.storage.from(SITE_ICON_BUCKET).upload(storagePath, entry.body, {
        contentType: entry.contentType,
        cacheControl: "31536000",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      uploadedPaths.push(storagePath);

      const previous = settings.assets[entry.item.slot];
      if (previous) settings.history[entry.item.slot] = [previous, ...(settings.history[entry.item.slot] ?? []).filter((item) => item.path !== previous.path)].slice(0, 8);
      settings.assets[entry.item.slot] = {
        path: storagePath,
        contentType: entry.contentType,
        size: entry.body.length,
        width: entry.width,
        height: entry.height,
        updatedAt: now,
      };
    }

    settings.updatedAt = now;
    const { error: saveError } = await admin.from("platform_settings").upsert(
      { key: SITE_ICON_SETTING_KEY, value: settings, updated_at: now },
      { onConflict: "key" },
    );
    if (saveError) throw saveError;

    await writeAuditEvent({
      actorId: auth.user.id,
      action: "site_icon_main_uploaded",
      entityType: "site_icon",
      entityId: "main",
      metadata: { generatedSlots: generated.map((entry) => entry.item.slot), count: generated.length, sourceFormat: "image/png" },
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    }).catch((auditError) => console.warn("[admin/site-icons/main] audit write failed after settings save", auditError));

    return NextResponse.json({ ok: true, slot: "main", generatedCount: generated.length, settings }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (uploadedPaths.length) {
      try {
        await createAdminClient().storage.from(SITE_ICON_BUCKET).remove(uploadedPaths);
      } catch (cleanupError) {
        console.error("[admin/site-icons/main] orphan cleanup failed", cleanupError);
      }
    }
    console.error("[admin/site-icons/main] upload failed", error);
    return NextResponse.json({ error: "Could not generate and publish the complete icon set. No partial icon set was activated; please retry." }, { status: 503 });
  }
}
