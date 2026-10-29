import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { CheckerResult, Finding } from "./types";
import { extractText, fileSafety, pdfInfo, type FileType } from "./file-inspect";
import { claimFindings, readProductPage } from "./product-signals";
import { seenFile } from "./fingerprints";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createServiceRoleClient() as unknown as { from: (t: string) => any; rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: any }> };

export type ProductInput = {
  file: { buf: Buffer; name: string; type: FileType; sha: string } | null;
  page: { url: URL; html: string; domainAgeDays: number | null } | null;
};

async function jimvioListing(url: URL): Promise<Finding[]> {
  if (!/(^|\.)jimvio\.com$/.test(url.hostname)) return [];
  const slug = /\/(?:marketplace|products?|digital)\/([^/?#]+)/.exec(url.pathname)?.[1];
  if (!slug) return [];
  const { data: p } = await db()
    .from("products")
    .select("name, rating, review_count, created_at, digital_verification_state, vendor:vendors!vendor_id (business_name, verification_status, created_at)")
    .eq("slug", slug)
    .maybeSingle();
  if (!p) return [{ tone: "info", title: "Jimvio link, but the product wasn't found", source: "Jimvio marketplace" }];
  const v = Array.isArray(p.vendor) ? p.vendor[0] : p.vendor;
  const f: Finding[] = [];
  f.push(
    v?.verification_status === "verified"
      ? { tone: "good", title: `Sold by ${v.business_name}, a verified Jimvio store`, source: "Jimvio marketplace" }
      : { tone: "info", title: `Sold by ${v?.business_name ?? "a Jimvio store"} (not yet verified)`, source: "Jimvio marketplace" },
  );
  if (p.digital_verification_state === "approved") f.push({ tone: "good", title: "File reviewed and approved by Jimvio", source: "Jimvio digital review" });
  if (Number(p.review_count ?? 0) > 0) f.push({ tone: "info", title: `${p.review_count} buyer review${p.review_count === 1 ? "" : "s"} on Jimvio (from paid orders)`, source: "Jimvio marketplace" });
  return f;
}

/** Checker 3: is this digital product safe, original-looking and honestly sold? */
export async function checkProduct(input: ProductInput, applicableReason: string): Promise<CheckerResult> {
  const base: CheckerResult = { id: "product", status: "not_applicable", summary: applicableReason, findings: [], metrics: [], sources: [], limits: [], nextSteps: [] };
  const { file, page } = input;
  if (!file && !page) return base;

  const findings: Finding[] = [];
  const sources = new Set<string>();
  const metrics: CheckerResult["metrics"] = [];
  const limits: string[] = [];
  let text = "";
  let nameForMatch: string | null = null;

  if (file) {
    sources.add("File inspection");
    findings.push(...fileSafety(file.buf, file.name, file.type));
    metrics.push({ label: "File", value: `${file.type.label} · ${(file.buf.length / 1024).toFixed(0)} KB` });
    metrics.push({ label: "SHA-256", value: `${file.sha.slice(0, 16)}…` });
    if (file.type.kind === "pdf") {
      const info = pdfInfo(file.buf);
      if (info.pages) metrics.push({ label: "Pages", value: String(info.pages) });
      if (info.producer) metrics.push({ label: "Made with", value: info.producer });
    }
    const seen = await seenFile(file.sha);
    if (seen.count > 0) findings.push({ tone: "warn", title: `This exact file was checked ${seen.count} time${seen.count === 1 ? "" : "s"} before on Jimvio`, detail: "Others may be selling or sharing the same file.", source: "Jimvio fingerprint history" });
    const { data: same } = await db().from("products").select("name, slug").eq("file_digest", file.sha).is("deleted_at", null).limit(3);
    if ((same ?? []).length) {
      sources.add("Jimvio marketplace");
      findings.push({ tone: "warn", title: "The same file is already sold on Jimvio", detail: (same as { name: string }[]).map((s) => s.name).join(", "), source: "Jimvio marketplace" });
    }
    text = extractText(file.buf, file.type) ?? "";
    if (!text && ["pdf", "office", "ebook"].includes(file.type.kind)) limits.push("Text inside this file couldn't be read, so originality and claims were checked from the name only.");
    nameForMatch = file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ");
  }

  if (page) {
    const p = readProductPage(page.html);
    sources.add("Product page");
    text += ` ${p.text}`;
    nameForMatch = p.name ?? nameForMatch;
    if (p.name) metrics.push({ label: "Product", value: p.name.slice(0, 80) });
    if (p.price) metrics.push({ label: "Price", value: p.price });
    if (p.rating) {
      metrics.push({ label: "Rating shown", value: p.rating });
      findings.push({ tone: "info", title: "The page shows its own rating", detail: "Ratings on a seller's own page can't be verified independently.", source: "Product page" });
    }
    findings.push(
      p.hasContact ? { tone: "good", title: "Seller contact details on the page", source: "Product page" } : { tone: "warn", title: "No way to contact the seller", source: "Product page" },
      p.hasRefund ? { tone: "good", title: "Mentions a refund policy", source: "Product page" } : { tone: "info", title: "No refund policy found", source: "Product page" },
    );
    if (page.domainAgeDays != null && page.domainAgeDays < 60) {
      findings.push({ tone: "warn", title: `Shop domain is only ${page.domainAgeDays} days old`, source: "RDAP" });
    }
    findings.push(...(await jimvioListing(page.url)));
  }

  findings.push(...claimFindings(text));
  if (nameForMatch && nameForMatch.length >= 6) {
    const { data: similar } = await db().rpc("trust_similar_products", { q: nameForMatch.slice(0, 200), max_rows: 3, only_digital: true });
    const close = ((similar ?? []) as { name: string; store: string | null; similarity: number }[]).filter((s) => s.similarity >= 0.6);
    if (close.length) {
      sources.add("Jimvio marketplace");
      findings.push({ tone: "info", title: "Similar products on Jimvio", detail: close.map((c) => `${c.name}${c.store ? ` (${c.store})` : ""}`).join("; "), source: "Jimvio marketplace" });
    }
  }

  limits.push(
    "A duplicate or similar match is a signal, not proof of copyright infringement.",
    "Jimvio can't confirm who legally owns a product without the owner's documents.",
  );
  if (file && file.type.kind !== "executable") limits.push("Jimvio checks file structure for risky features; it is not a full antivirus scan.");

  const bad = findings.filter((x) => x.tone === "bad").length;
  const warn = findings.filter((x) => x.tone === "warn").length;
  const status: CheckerResult["status"] = bad >= 2 || (bad && warn >= 2) ? "high_risk" : bad || warn >= 2 ? "suspicious" : warn === 1 ? "evidence_found" : "low_risk";
  return {
    ...base,
    status,
    summary:
      status === "high_risk"
        ? "Strong warning signs: don't open or buy this before checking further."
        : status === "suspicious"
          ? "Some warning signs about safety, originality or the seller."
          : status === "evidence_found"
            ? "Mostly fine, with one thing worth checking."
            : "No safety problems or suspicious claims found.",
    findings,
    metrics,
    sources: [...sources],
    limits,
    nextSteps:
      status === "low_risk"
        ? ["Keep your receipt and the seller's contact details."]
        : ["Pay only through a platform with buyer protection.", "Ask the seller for proof they own or licensed the content.", "Never run programs from unknown sellers."],
  };
}
