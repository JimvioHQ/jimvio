import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminAccess } from "@/lib/cj/premium-intelligence/super-admin-auth";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProductRow = {
  id: string;
  name: string;
  status: string | null;
  deleted_at: string | null;
  images: unknown;
};

type ResultItem = { id: string; name: string; reason?: string; error?: string };

function parseImages(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string" && x.startsWith("http"));
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === "string" && x.startsWith("http"));
      }
    } catch {
      if (raw.startsWith("http")) return [raw];
    }
  }
  return [];
}

async function resolveMatchingIds(
  admin: ReturnType<typeof createAdminClient>,
  filters: {
    q?: string;
    status?: string;
    source?: string;
    featured?: string;
  }
): Promise<string[]> {
  let query = admin
    .from("products")
    .select("id")
    .is("deleted_at", null);

  if (filters.q?.trim()) {
    const term = filters.q.trim();
    query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%,sku.ilike.%${term}%`);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.featured === "1") {
    query = query.eq("is_featured", true);
  }

  if (filters.source && filters.source !== "all") {
    query = query.eq("source", filters.source);
  }

  const { data, error } = await query.limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.id as string);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await assertAdminAccess();
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const selectAll = Boolean(body?.selectAll);
    const dryRun = Boolean(body?.dryRun);
    const filters = (body?.filters ?? {}) as {
      q?: string;
      status?: string;
      source?: string;
      featured?: string;
    };

    let productIds: string[] = Array.isArray(body?.productIds)
      ? body.productIds
      : [];

    const admin = createAdminClient();

    if (selectAll) {
      productIds = await resolveMatchingIds(admin, filters);
    }

    if (dryRun) {
      if (productIds.length === 0) {
        return NextResponse.json({ success: true, products: [], total: 0 });
      }
      const { data: previewRows, error: previewError } = await admin
        .from("products")
        .select("id, name, status, deleted_at, images")
        .in("id", productIds)
        .is("deleted_at", null);

      if (previewError) {
        return NextResponse.json(
          { success: false, error: previewError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        total: previewRows?.length ?? 0,
        products: (previewRows ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          images: r.images,
        })),
      });
    }

    if (productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No product IDs provided." },
        { status: 400 }
      );
    }

    if (productIds.some((id) => !UUID_REGEX.test(id))) {
      return NextResponse.json(
        { success: false, error: "One or more IDs are invalid." },
        { status: 400 }
      );
    }

    const uniqueIds = [...new Set(productIds)];

    const { data: rows, error: fetchError } = await admin
      .from("products")
      .select("id, name, status, deleted_at, images")
      .in("id", uniqueIds);

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      );
    }

    const byId = new Map((rows ?? []).map((r) => [r.id as string, r as ProductRow]));
    const publishableIds: string[] = [];
    const published: ResultItem[] = [];
    const skipped: ResultItem[] = [];
    const failed: ResultItem[] = [];

    for (const id of uniqueIds) {
      const row = byId.get(id);
      if (!row) {
        skipped.push({ id, name: id, reason: "Not found" });
        continue;
      }

      const name = row.name ?? id;

      if (row.deleted_at) {
        skipped.push({ id, name, reason: "Deleted" });
        continue;
      }

      if (row.status === "archived") {
        skipped.push({ id, name, reason: "Archived" });
        continue;
      }

      if (row.status === "active") {
        skipped.push({ id, name, reason: "Already active" });
        continue;
      }

      if ((row.status ?? "draft") !== "draft") {
        skipped.push({ id, name, reason: `Status: ${row.status ?? "unknown"}` });
        continue;
      }

      if (parseImages(row.images).length === 0) {
        skipped.push({ id, name, reason: "No images" });
        continue;
      }

      publishableIds.push(id);
    }

    if (publishableIds.length > 0) {
      const now = new Date().toISOString();
      const { error: updateError } = await admin
        .from("products")
        .update({
          status: "active",
          is_active: true,
          updated_at: now,
        })
        .in("id", publishableIds)
        .eq("status", "draft")
        .is("deleted_at", null);

      if (updateError) {
        for (const id of publishableIds) {
          const row = byId.get(id);
          failed.push({
            id,
            name: row?.name ?? id,
            error: updateError.message,
          });
        }
      } else {
        for (const id of publishableIds) {
          const row = byId.get(id);
          published.push({ id, name: row?.name ?? id });
        }
      }
    }

    console.info("[bulk-publish audit]", {
      adminId: auth.user.id,
      adminEmail: auth.user.email,
      timestamp: new Date().toISOString(),
      requested: uniqueIds.length,
      published: published.length,
      skipped: skipped.length,
      failed: failed.length,
      productIds: published.map((p) => p.id),
    });

    return NextResponse.json({
      success: true,
      published: published.length,
      skipped: skipped.length,
      failed,
      details: { published, skipped, failed },
    });
  } catch (err) {
    console.error("[bulk-publish]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Bulk publish failed",
      },
      { status: 500 }
    );
  }
}
