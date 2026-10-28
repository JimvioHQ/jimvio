"use server";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { writeAuditEvent } from "@/services/ops/audit";
import { catalogByLocator } from "@/lib/editorial/ingest/catalog";
import { fetchFeed } from "@/lib/editorial/ingest/fetch";
import { canonicalUrl } from "@/lib/editorial/ingest/feed";
import { serverAutopublishAuthorized } from "@/lib/editorial/ingest/plan";
import { getIngestSource, insertSource, loadIngestDesk, saveIngestSettings, setSourceEnabled } from "@/lib/editorial/ingest/store";
import { runIngestCycle } from "@/lib/editorial/ingest/run";
import { DAILY_PUBLISH_MAX, type IngestMode } from "@/lib/editorial/ingest/types";
import { isArticleId, isMediaCategory } from "@/lib/editorial/validate";

const CONFIRM = "AUTHORIZE AUTOMATIC PUBLICATION";

async function requireAdmin() {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) redirect("/media/admin/sources?notice=denied");
  return auth.user;
}

async function audit(actorId: string, action: string, entityId: string, metadata: Record<string, unknown>) {
  const headerStore = await headers();
  await writeAuditEvent({
    actorId,
    action,
    entityType: "media_source",
    entityId,
    metadata,
    ip: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerStore.get("user-agent"),
  });
}

function notice(path: string, code: string, extra?: Record<string, number>): never {
  const params = new URLSearchParams({ notice: code });
  for (const [key, value] of Object.entries(extra ?? {})) params.set(key, String(value));
  redirect(`${path}?${params.toString()}`);
}

function modeOf(value: FormDataEntryValue | null): IngestMode {
  const mode = String(value ?? "");
  if (mode === "disabled" || mode === "discovery" || mode === "draft" || mode === "review" || mode === "auto") return mode;
  return "draft";
}

function bounded(value: FormDataEntryValue | null, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export async function saveIngestControls(formData: FormData) {
  const user = await requireAdmin();
  const current = await loadIngestDesk();
  if (current.unavailable) notice("/media/admin/sources", "storage");
  const blocked = formData.getAll("blocked").map(String).filter((value) => isMediaCategory(value));
  const requestedOwner = formData.get("owner") === "on" && String(formData.get("confirmation") ?? "") === CONFIRM;
  const owner = requestedOwner && serverAutopublishAuthorized() ? true : false;
  const saved = await saveIngestSettings({
    mode: modeOf(formData.get("mode")),
    emergencyStop: formData.get("emergency") === "on",
    ownerAutopublishAuthorized: owner,
    dailyPublishCap: bounded(formData.get("cap"), DAILY_PUBLISH_MAX, 0, DAILY_PUBLISH_MAX),
    maxItemsPerRun: bounded(formData.get("items"), 20, 1, 40),
    retryLimit: bounded(formData.get("retries"), 3, 1, 8),
    staleDays: bounded(formData.get("stale"), 21, 1, 90),
    blockedCategories: blocked,
  });
  if (saved.unavailable) notice("/media/admin/sources", "storage");
  await audit(user.id, "media_ingest_settings", user.id, { mode: String(formData.get("mode") ?? ""), emergency: formData.get("emergency") === "on" });
  updateTag("editorial");
  revalidatePath("/media/admin/sources");
  if (requestedOwner && !serverAutopublishAuthorized()) notice("/media/admin/sources", "autopublish");
  notice("/media/admin/sources", formData.get("emergency") === "on" ? "stopped" : "saved");
}

export async function enableVerifiedSource(formData: FormData) {
  const user = await requireAdmin();
  const locator = String(formData.get("locator") ?? "");
  const catalog = catalogByLocator(locator);
  if (!catalog) notice("/media/admin/sources", "invalid");
  const probed = await fetchFeed(catalog.locator);
  if (!probed.ok || probed.items.length === 0) notice("/media/admin/sources", "invalid");
  const saved = await insertSource({ ...catalog, enabled: true, verifiedAt: new Date().toISOString(), accessMethod: probed.format });
  if (saved.unavailable) notice("/media/admin/sources", "storage");
  if (!saved.ok) notice("/media/admin/sources", "invalid");
  await audit(user.id, "media_source_enabled", saved.id ?? user.id, { locator: catalog.locator });
  revalidatePath("/media/admin/sources");
  notice("/media/admin/sources", "enabled");
}

export async function setIngestSourceEnabled(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isArticleId(id)) notice("/media/admin/sources", "invalid");
  const enabled = formData.get("enabled") === "1";
  if (enabled) {
    const source = await getIngestSource(id);
    if (source === "unavailable") notice("/media/admin/sources", "storage");
    if (!source) notice("/media/admin/sources", "invalid");
    if (source.kind === "licensed" || source.kind === "api" || source.permittedUsage === "none") notice("/media/admin/sources", "credentials");
    const probed = await fetchFeed(source.locator);
    if (!probed.ok || probed.items.length === 0) notice("/media/admin/sources", "invalid");
  }
  const saved = await setSourceEnabled(id, enabled);
  if (saved.unavailable) notice("/media/admin/sources", "storage");
  await audit(user.id, enabled ? "media_source_enabled" : "media_source_disabled", id, {});
  revalidatePath("/media/admin/sources");
  notice("/media/admin/sources", "saved");
}

export async function addIngestSource(formData: FormData) {
  const user = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const locator = canonicalUrl(String(formData.get("locator") ?? ""));
  const kind = String(formData.get("kind") ?? "");
  const category = String(formData.get("category") ?? "");
  const usage = String(formData.get("usage") ?? "");
  if (name.length < 2 || name.length > 120) notice("/media/admin/sources", "invalid");
  if (!locator) notice("/media/admin/sources", "invalid");
  if (!isMediaCategory(category)) notice("/media/admin/sources", "invalid");
  if (kind === "licensed" || kind === "api" || usage === "none") notice("/media/admin/sources", "credentials");
  if (kind !== "rss" && kind !== "atom" && kind !== "announcement" && kind !== "educational") notice("/media/admin/sources", "invalid");
  if (usage !== "link" && usage !== "facts" && usage !== "full") notice("/media/admin/sources", "invalid");
  const enabled = formData.get("enabled") === "on";
  if (enabled) {
    const probed = await fetchFeed(locator);
    if (!probed.ok || probed.items.length === 0) notice("/media/admin/sources", "invalid");
  }
  const saved = await insertSource({
    name,
    kind,
    locator,
    categories: [category],
    language: String(formData.get("language") ?? "en").toLowerCase().slice(0, 12) || "en",
    region: String(formData.get("region") ?? "global").trim().slice(0, 40) || "global",
    permittedUsage: usage,
    imageRights: "none",
    pollMinutes: bounded(formData.get("poll"), 360, 60, 10080),
    enabled,
    alwaysReview: formData.get("review") === "on",
    termsNote: "Added by an administrator. Images are not reused unless a later rights check passes.",
    rateNote: "One request when the source is due, with an 8 second timeout.",
    accessMethod: kind === "atom" ? "atom" : "rss",
    verifiedAt: enabled ? new Date().toISOString() : null,
  });
  if (saved.unavailable) notice("/media/admin/sources", "storage");
  if (!saved.ok) notice("/media/admin/sources", "invalid");
  await audit(user.id, "media_source_added", saved.id ?? user.id, { locator });
  revalidatePath("/media/admin/sources");
  notice("/media/admin/sources", enabled ? "enabled" : "saved");
}

export async function runIngestNow() {
  const user = await requireAdmin();
  const result = await runIngestCycle({ actorId: user.id });
  if (result.unavailable || result.skipped === "storage") notice("/media/admin/ingestion", "storage");
  if (result.skipped === "emergency") notice("/media/admin/ingestion", "stopped");
  if (result.skipped === "disabled") notice("/media/admin/ingestion", "disabled");
  await audit(user.id, "media_ingest_run", user.id, result.counts);
  notice("/media/admin/ingestion", "ran", {
    drafted: result.counts.drafted,
    review: result.counts.review,
    published: result.counts.published,
    failed: result.counts.failed,
  });
}

export async function retryIngestSource(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isArticleId(id)) notice("/media/admin/ingestion", "invalid");
  const result = await runIngestCycle({ sourceId: id, force: true, actorId: user.id });
  if (result.unavailable) notice("/media/admin/ingestion", "storage");
  if (result.skipped === "emergency") notice("/media/admin/ingestion", "stopped");
  if (result.counts.sources === 0 && result.counts.failed > 0) notice("/media/admin/ingestion", "retry_limited");
  await audit(user.id, "media_ingest_retry", id, result.counts);
  notice("/media/admin/ingestion", "ran", { failed: result.counts.failed, drafted: result.counts.drafted });
}
