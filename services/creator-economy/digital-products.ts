import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const DIGITAL_SUBTYPES = ["pdf", "zip", "video", "template", "source_code", "notion", "figma"] as const;
export type DigitalSubtype = (typeof DIGITAL_SUBTYPES)[number];

function db() {
  return createServiceRoleClient();
}

async function assertProductOwner(productId: string, userId: string) {
  const { data, error } = await db()
    .from("products")
    .select("id, vendor_id, digital_file_url, vendors!inner(user_id)")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  if (!data || (data.vendors as unknown as { user_id: string }).user_id !== userId) {
    throw new Error("Forbidden");
  }
  return data;
}

export async function listLibrary(userId: string) {
  const { data, error } = await db()
    .from("digital_access")
    .select("id, product_id, subtype, granted_at, expires_at, revoked_at, download_count, download_limit, license_key, last_download_at, products!inner(id, name, slug, images, digital_file_url, currency)")
    .eq("user_id", userId)
    .order("granted_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createVersion(input: {
  productId: string; userId: string; version: string; fileUrl: string; fileSize?: number | null;
  checksum?: string | null; changelog?: string | null;
}) {
  await assertProductOwner(input.productId, input.userId);
  const { data, error } = await db().from("digital_product_versions").insert({
    product_id: input.productId, version: input.version, file_url: input.fileUrl,
    file_size: input.fileSize ?? null, checksum: input.checksum ?? null,
    changelog: input.changelog ?? null, created_by: input.userId,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function listVersions(productId: string, userId: string) {
  await assertProductOwner(productId, userId);
  const { data, error } = await db().from("digital_product_versions").select("*")
    .eq("product_id", productId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function issueLicenseKey(accessId: string, userId: string) {
  const { data: access, error: accessError } = await db().from("digital_access")
    .select("id, user_id, license_key").eq("id", accessId).maybeSingle();
  if (accessError) throw accessError;
  if (!access || access.user_id !== userId) throw new Error("Forbidden");
  if (access.license_key) return access.license_key;
  const key = `JMV-${crypto.randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`;
  const { error } = await db().from("digital_access").update({ license_key: key }).eq("id", accessId);
  if (error) throw error;
  return key;
}

export async function requestSecureDownload(input: {
  userId: string; productId: string; ip?: string | null; userAgent?: string | null;
}) {
  const client = db();
  const { data: access, error } = await client.from("digital_access").select("*")
    .eq("user_id", input.userId).eq("product_id", input.productId).maybeSingle();
  if (error) throw error;
  if (!access || access.revoked_at || (access.expires_at && new Date(access.expires_at) <= new Date())) {
    throw new Error("No active access to this product");
  }
  if (access.download_limit !== null && Number(access.download_count) >= Number(access.download_limit)) {
    throw new Error("Download limit reached");
  }
  const [{ data: newest }, { data: product, error: productError }] = await Promise.all([
    client.from("digital_product_versions").select("file_url, version").eq("product_id", input.productId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("products").select("digital_file_url").eq("id", input.productId).maybeSingle(),
  ]);
  if (productError || !product) throw productError ?? new Error("Product not found");
  const url = newest?.file_url || product.digital_file_url || access.access_url;
  if (!url) throw new Error("Download file is unavailable");

  const now = new Date().toISOString();
  const { error: updateError } = await client.from("digital_access").update({
    download_count: Number(access.download_count ?? 0) + 1, last_download_at: now,
  }).eq("id", access.id);
  if (updateError) throw updateError;
  await client.from("digital_download_events").insert({
    access_id: access.id, user_id: input.userId, product_id: input.productId,
    ip: input.ip ?? null, user_agent: input.userAgent ?? null,
  });
  // This API-only handoff keeps authorization and audit logging server-side.
  return { url, version: newest?.version ?? null, remaining: access.download_limit === null ? null : Number(access.download_limit) - Number(access.download_count) - 1 };
}
