/**
 * AI Recommendations v3 — actionable catalog improvement suggestions.
 */

import { getCatalogDB } from "./db";

export interface AiRecommendation {
  category: string;
  issue: string;
  productCount: number;
  recommendation: string;
  action: string;
  priority: number;
}

export async function generateAiRecommendations(): Promise<AiRecommendation[]> {
  const db = getCatalogDB();

  const [
    { count: missingVideo },
    { count: missingImages },
    { count: supplierProblems },
    { count: missingShipping },
    { count: duplicates },
  ] = await Promise.all([
    db
      .from("cj_product_intelligence")
      .select("pid", { count: "exact", head: true })
      .contains("auto_publish_failures", ["Missing Product Video"]),
    db
      .from("cj_product_intelligence")
      .select("pid", { count: "exact", head: true })
      .contains("auto_publish_failures", ["Insufficient Images"]),
    db
      .from("cj_supplier_reputation")
      .select("supplier_id", { count: "exact", head: true })
      .eq("blacklisted", true),
    db
      .from("cj_product_intelligence")
      .select("pid", { count: "exact", head: true })
      .contains("auto_publish_failures", ["Fast Shipping Missing"]),
    db
      .from("cj_product_duplicates")
      .select("id", { count: "exact", head: true })
      .eq("blocked", true),
  ]);

  const recommendations: AiRecommendation[] = [];

  if ((missingVideo ?? 0) > 0) {
    recommendations.push({
      category: "Video",
      issue: "Missing Video",
      productCount: missingVideo ?? 0,
      recommendation: "Skip or generate AI video for products without video content",
      action: "skip_or_generate_video",
      priority: 90,
    });
  }

  if ((missingImages ?? 0) > 0) {
    recommendations.push({
      category: "Images",
      issue: "Missing Images",
      productCount: missingImages ?? 0,
      recommendation: "Fetch detail images via enrichment pipeline",
      action: "fetch_detail_images",
      priority: 85,
    });
  }

  if ((supplierProblems ?? 0) > 0) {
    recommendations.push({
      category: "Supplier",
      issue: "Supplier Problems",
      productCount: supplierProblems ?? 0,
      recommendation: "Blacklist underperforming suppliers below reputation threshold",
      action: "blacklist_supplier",
      priority: 95,
    });
  }

  if ((missingShipping ?? 0) > 0) {
    recommendations.push({
      category: "Shipping",
      issue: "Missing Fast Shipping",
      productCount: missingShipping ?? 0,
      recommendation: "Filter catalog to fast-shipping warehouses only",
      action: "filter_fast_shipping",
      priority: 80,
    });
  }

  if ((duplicates ?? 0) > 0) {
    recommendations.push({
      category: "Duplicates",
      issue: "Duplicate Products",
      productCount: duplicates ?? 0,
      recommendation: "Review and merge duplicate catalog entries before publishing",
      action: "review_duplicates",
      priority: 88,
    });
  }

  recommendations.sort((a, b) => b.priority - a.priority);

  const now = new Date().toISOString();
  await db.from("cj_ai_recommendations").delete().lt("generated_at", now);

  if (recommendations.length > 0) {
    await db.from("cj_ai_recommendations").insert(
      recommendations.map((r) => ({
        category: r.category,
        issue: r.issue,
        product_count: r.productCount,
        recommendation: r.recommendation,
        action: r.action,
        priority: r.priority,
        generated_at: now,
      }))
    );
  }

  return recommendations;
}

export async function getLatestRecommendations(): Promise<AiRecommendation[]> {
  const db = getCatalogDB();
  const { data } = await db
    .from("cj_ai_recommendations")
    .select("*")
    .order("priority", { ascending: false })
    .limit(20);

  return (data ?? []).map((r) => ({
    category: r.category,
    issue: r.issue,
    productCount: r.product_count,
    recommendation: r.recommendation,
    action: r.action,
    priority: r.priority,
  }));
}
