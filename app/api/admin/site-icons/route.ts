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

const SAFE_SVG_TAGS = new Set([
  "svg", "g", "path", "circle", "rect", "ellipse", "line", "polyline", "polygon",
  "defs", "linearGradient", "radialGradient", "stop", "clipPath", "mask",
]);
const SAFE_SVG_ATTRIBUTES = new Set([
  "xmlns", "viewBox", "width", "height", "preserveAspectRatio", "version", "id",
  "d", "points", "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width",
  "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray",
  "stroke-dashoffset", "stroke-opacity", "opacity", "transform", "x", "y", "cx",
  "cy", "r", "rx", "ry", "x1", "y1", "x2", "y2", "offset", "stop-color",
  "stop-opacity", "gradientUnits", "gradientTransform", "clip-path", "mask",
]);

/** Rebuild SVG from a conservative element/attribute allow-list. */
function sanitizeUploadedSvg(input: string): string | null {
  const source = input.replace(/^\uFEFF/, "").trim().replace(/^<\?xml[^>]*>\s*/i, "");
  if (!source || source.length > SITE_ICON_MAX_BYTES || /<!DOCTYPE|<!ENTITY|<\?|<!--|-->/i.test(source)) return null;
  const tokens = source.match(/<[^>]*>|[^<]+/g);
  if (!tokens || tokens.join("") !== source) return null;

  const output: string[] = [];
  const stack: string[] = [];
  let rootSeen = false;
  let rootClosed = false;

  for (const token of tokens) {
    if (!token.startsWith("<")) {
      if (token.trim()) return null;
      continue;
    }
    const closing = token.match(/^<\/([A-Za-z][A-Za-z0-9]*)\s*>$/);
    if (closing) {
      const tag = closing[1];
      if (stack.pop() !== tag) return null;
      output.push(\`</\${tag}>\`);
      if (tag === "svg" && stack.length === 0) rootClosed = true;
      continue;
    }

    const opening = token.match(/^<([A-Za-z][A-Za-z0-9]*)([\s\S]*?)\s*(\/?)>$/);
    if (!opening) return null;
    const tag = opening[1];
    const rawAttributes = opening[2];
    const selfClosing = opening[3] === "/";
    if (!SAFE_SVG_TAGS.has(tag) || rootClosed) return null;
    if (!rootSeen && tag !== "svg") return null;
    if (tag === "svg") {
      if (rootSeen || stack.length !== 0) return null;
      rootSeen = true;
    } else if (!rootSeen || stack.length === 0) {
      return null;
    }

    const attributes: string[] = [];
    const seen = new Set<string>();
    let rest = rawAttributes;
    while (rest.trim()) {
      const match = rest.match(/^\s+([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*("[^"]*"|'[^']*')/);
      if (!match) return null;
      const name = match[1];
      const value = match[2].slice(1, -1);
      if (!SAFE_SVG_ATTRIBUTES.has(name) || seen.has(name)) return null;
      if (/[<>\u0000-\u001f]/.test(value) || /(?:javascript:|data:|https?:|\/\/|\\|@import|expression\s*\()/i.test(value)) return null;
      if (/url\s*\(/i.test(value) && !/^url\(#[A-Za-z0-9_.-]+\)$/i.test(value)) return null;
      if (name === "xmlns" && value !== "http://www.w3.org/2000/svg") return null;
      if (/[&](?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i.test(value)) return null;
      seen.add(name);
      attributes.push(\`\${name}="\${value}"\`);
      rest = rest.slice(match[0].length);
    }

    output.push(\`<\${tag}\${attributes.length ? " " + attributes.join(" ") : ""}\${selfClosing ? " />" : ">" }\`);
    if (!selfClosing) stack.push(tag);
    else if (tag === "svg" && stack.length === 0) rootClosed = true;
  }

  if (!rootSeen || !rootClosed || stack.length !== 0) return null;
  return output.join("");
}

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
  const auth = await assertPlatformAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Unauthorized" : "Forbidden" }, { status: auth.status });
  try {
    const settings = await loadSettings(createAdminClient());
    return NextResponse.json(settings, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[admin/site-icons] load failed", error);
    return NextResponse.json({ error: "Could not load icon settings" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Unauthorized" : "Forbidden" }, { status: auth.status });

  const limited = rateLimit(`site-icon-admin:${auth.user.id}`, 30, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many changes. Try again shortly." }, { status: 429 });

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > SITE_ICON_MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Icon upload request is too large" }, { status: 413 });
  }

  const admin = createAdminClient();
  try {
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
      });
      return NextResponse.json({ ok: true, settings });
    }

    const form = await request.formData();
    const slot = String(form.get("slot") ?? "");
    const file = form.get("file");
    const definition = getSiteIconDefinition(slot);
    if (!definition || !(file instanceof File)) return NextResponse.json({ error: "Choose a valid icon and file" }, { status: 400 });
    if (file.size <= 0 || file.size > SITE_ICON_MAX_BYTES) return NextResponse.json({ error: "Icon must be smaller than 1 MB" }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    let body: Buffer = bytes;
    let detectedType = "";
    let width = definition.width;
    let height = definition.height;
    let extension = definition.filename.split(".").pop() ?? "png";

    if (definition.contentType === "image/png") {
      const meta = await sharp(bytes, { failOn: "error" }).metadata();
      if (meta.format !== "png" || meta.width !== definition.width || meta.height !== definition.height) {
        return NextResponse.json({ error: `Upload a PNG that is exactly ${definition.width} × ${definition.height} pixels` }, { status: 400 });
      }
      detectedType = "image/png";
    } else if (definition.contentType === "image/x-icon") {
      if (bytes.length < 22 || bytes[0] !== 0 || bytes[1] !== 0 || bytes[2] !== 1 || bytes[3] !== 0) {
        return NextResponse.json({ error: "Upload a valid Windows ICO file" }, { status: 400 });
      }
      const frameCount = bytes.readUInt16LE(4);
      const directoryEnd = 6 + frameCount * 16;
      if (frameCount < 1 || directoryEnd > bytes.length) {
        return NextResponse.json({ error: "ICO directory is invalid" }, { status: 400 });
      }
      const frameSizes = new Set<number>();
      for (let index = 0; index < frameCount; index += 1) {
        const offset = 6 + index * 16;
        const frameWidth = bytes[offset] || 256;
        const frameHeight = bytes[offset + 1] || 256;
        const frameBytes = bytes.readUInt32LE(offset + 8);
        const frameOffset = bytes.readUInt32LE(offset + 12);
        if (frameBytes <= 0 || frameOffset < directoryEnd || frameOffset + frameBytes > bytes.length) {
          return NextResponse.json({ error: "ICO frame data is invalid" }, { status: 400 });
        }
        if (frameWidth === frameHeight && [16, 32, 48].includes(frameWidth)) frameSizes.add(frameWidth);
      }
      if (![16, 32, 48].every((size) => frameSizes.has(size))) {
        return NextResponse.json({ error: "ICO must include 16, 32 and 48 pixel frames" }, { status: 400 });
      }
      detectedType = "image/x-icon";
    } else {
      const raw = bytes.toString("utf8");
      const sanitized = sanitizeUploadedSvg(raw);
      if (!sanitized) {
        return NextResponse.json({ error: "SVG is invalid or contains unsupported or unsafe elements. Use a simple SVG with standard vector shapes only." }, { status: 400 });
      }
      body = Buffer.from(sanitized, "utf8");
      detectedType = "image/svg+xml";
      extension = "svg";
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
    });

    return NextResponse.json({ ok: true, slot, asset, settings });
  } catch (error) {
    console.error("[admin/site-icons] update failed", error);
    return NextResponse.json({ error: "Could not update this icon" }, { status: 503 });
  }
}
