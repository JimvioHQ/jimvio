import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/services/ops/audit";
import { rateLimit } from "@/lib/ops/rate-limit";
import {
  getSiteIconDefinition,
  SITE_ICON_BUCKET,
  SITE_ICON_MAX_BYTES,
  SITE_ICON_SETTING_KEY,
} from "@/lib/site-icons/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type IconAsset = { path: string; contentType: string; size: number; width: number; height: number; updatedAt: string };
type IconSettings = { assets: Record<string, IconAsset>; history: Record<string, IconAsset[]>; updatedAt: string };

function emptySettings(): IconSettings {
  return { assets: {}, history: {}, updatedAt: new Date(0).toISOString() };
}

async function loadSettings(admin: ReturnType<typeof createAdminClient>): Promise<IconSettings> {
  const { data, error } = await admin.from("platform_settings").select("value").eq("key", SITE_ICON_SETTING_KEY).maybeSingle();
  if (error) throw error;
  const value = data?.value && typeof data.value === "object" ? data.value as Partial<IconSettings> : {};
  return {
    assets: value.assets && typeof value.assets === "object" ? value.assets : {},
    history: value.history && typeof value.history === "object" ? value.history : {},
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
  };
}

async function saveSettings(admin: ReturnType<typeof createAdminClient>, settings: IconSettings) {
  const { error } = await admin.from("platform_settings").upsert(
    { key: SITE_ICON_SETTING_KEY, value: settings, updated_at: settings.updatedAt },
    { onConflict: "key" },
  );
  if (error) throw error;
}

export async function GET() {
  try {
    const auth = await assertPlatformAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Unauthorized" : "Forbidden" }, { status: auth.status });
    const settings = await loadSettings(createAdminClient());
    return NextResponse.json(settings, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[admin/site-icons] load failed", error);
    return NextResponse.json({ error: "Could not load icon settings" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof assertPlatformAdmin>>;
  try {
    auth = await assertPlatformAdmin();
  } catch (error) {
    console.error("[admin/site-icons] authorization check failed", error);
    return NextResponse.json({ error: "Could not verify administrator access. Refresh and sign in again." }, { status: 503 });
  }
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Unauthorized" : "Forbidden" }, { status: auth.status });

  const limited = rateLimit(`site-icon-admin:${auth.user.id}`, 30, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many changes. Try again shortly." }, { status: 429 });

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > SITE_ICON_MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Icon upload request is too large" }, { status: 413 });
  }

  try {
    const admin = createAdminClient();
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => null) as { action?: string; slot?: string; versionPath?: string } | null;
      const slot = String(body?.slot ?? "");
      const definition = getSiteIconDefinition(slot);
      if (!definition) return NextResponse.json({ error: "Unknown icon slot" }, { status: 400 });
      const settings = await loadSettings(admin);
      const current = settings.assets[slot];
      if (body?.action === "reset") {
        if (current) settings.history[slot] = [current, ...(settings.history[slot] ?? []).filter((item) => item.path !== current.path)].slice(0, 8);
        delete settings.assets[slot];
      } else if (body?.action === "restore") {
        const version = settings.history[slot]?.find((item) => item.path === body.versionPath);
        if (!version) return NextResponse.json({ error: "That saved version is unavailable" }, { status: 404 });
        settings.history[slot] = [ ...(current ? [current] : []), ...(settings.history[slot] ?? []).filter((item) => item.path !== version.path) ].slice(0, 8);
        settings.assets[slot] = version;
      } else {
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
      }
      settings.updatedAt = new Date().toISOString();
      await saveSettings(admin, settings);
      await writeAuditEvent({
        actorId: auth.user.id,
        action: body.action === "reset" ? "site_icon_reset" : "site_icon_restored",
        entityType: "site_icon",
        entityId: slot,
        metadata: { slot, previousPath: current?.path ?? null, activePath: settings.assets[slot]?.path ?? null },
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: request.headers.get("user-agent"),
      }).catch((auditError) => console.warn("[admin/site-icons] audit write failed after settings save", auditError));
      return NextResponse.json({ ok: true, settings });
    }

    const form = await request.formData();
    const slot = String(form.get("slot") ?? "");
    const file = form.get("file");
    const definition = getSiteIconDefinition(slot);
    if (!definition || !(file instanceof File)) return NextResponse.json({ error: "Choose a valid icon and file" }, { status: 400 });
    if (file.size <= 0 || file.size > SITE_ICON_MAX_BYTES) return NextResponse.json({ error: "Icon must be smaller than 1 MB" }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const sourceMeta = await sharp(bytes, { failOn: "error" }).metadata();
    if (sourceMeta.format !== "png" || !sourceMeta.width || !sourceMeta.height) {
      return NextResponse.json({ error: "Upload a valid PNG image. Other file formats are not accepted." }, { status: 400 });
    }

    let body: Buffer;
    let detectedType = definition.contentType;
    let width = definition.width || 512;
    let height = definition.height || 512;
    const extension = definition.filename.split(".").pop() ?? "png";

    if (definition.contentType === "image/x-icon") {
      const sizes = [16, 32, 48];
      const frames = await Promise.all(sizes.map((size) =>
        sharp(bytes, { failOn: "error" })
          .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()
      ));
      const directoryEnd = 6 + frames.length * 16;
      const totalBytes = frames.reduce((sum, frame) => sum + frame.length, 0);
      body = Buffer.alloc(directoryEnd + totalBytes);
      body.writeUInt16LE(0, 0);
      body.writeUInt16LE(1, 2);
      body.writeUInt16LE(frames.length, 4);
      let dataOffset = directoryEnd;
      frames.forEach((frame, index) => {
        const entry = 6 + index * 16;
        body[entry] = sizes[index];
        body[entry + 1] = sizes[index];
        body[entry + 2] = 0;
        body[entry + 3] = 0;
        body.writeUInt16LE(1, entry + 4);
        body.writeUInt16LE(32, entry + 6);
        body.writeUInt32LE(frame.length, entry + 8);
        body.writeUInt32LE(dataOffset, entry + 12);
        frame.copy(body, dataOffset);
        dataOffset += frame.length;
      });
    } else if (definition.contentType === "image/svg+xml") {
      const raster = await sharp(bytes, { failOn: "error" })
        .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      const encoded = raster.toString("base64");
      body = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image width="${width}" height="${height}" href="data:image/png;base64,${encoded}"/></svg>`, "utf8");
    } else {
      body = await sharp(bytes, { failOn: "error" })
        .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    }

    const path = `site-icons/${slot}/${Date.now()}-${randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage.from(SITE_ICON_BUCKET).upload(path, body, {
      contentType: detectedType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) {
      console.error("[admin/site-icons] storage upload failed", uploadError.message);
      return NextResponse.json({ error: "Icon upload failed. Please retry." }, { status: 503 });
    }

    const settings = await loadSettings(admin);
    const previous = settings.assets[slot];
    if (previous) settings.history[slot] = [previous, ...(settings.history[slot] ?? []).filter((item) => item.path !== previous.path)].slice(0, 8);
    const asset: IconAsset = { path, contentType: detectedType, size: body.length, width, height, updatedAt: new Date().toISOString() };
    settings.assets[slot] = asset;
    settings.updatedAt = asset.updatedAt;
    await saveSettings(admin, settings);

    await writeAuditEvent({
      actorId: auth.user.id,
      action: "site_icon_uploaded",
      entityType: "site_icon",
      entityId: slot,
      metadata: { slot, path, contentType: detectedType, size: body.length, previousPath: previous?.path ?? null },
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    }).catch((auditError) => console.warn("[admin/site-icons] audit write failed after upload", auditError));

    return NextResponse.json({ ok: true, slot, asset, settings });
  } catch (error) {
    console.error("[admin/site-icons] update failed", error);
    return NextResponse.json({ error: "Could not update this icon" }, { status: 503 });
  }
}
