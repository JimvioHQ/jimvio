import CJImportBrowser from "@/components/admin/cj/cj-import-browser";
import { getAdminDB } from "@/services/db";

export const metadata = {
  title: "Import Intelligence · CJ · Admin",
  description: "World-class product sourcing dashboard with profit intelligence, health scores, and smart filters.",
};

export const dynamic = "force-dynamic";

export default async function ImportCJProductPage() {
  const admin = getAdminDB();

  const [{ count: cjDraftCount }, { count: cjTotalCount }] = await Promise.all([
    admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("source", "cj")
      .eq("status", "draft")
      .is("deleted_at", null),
    admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("source", "cj")
      .is("deleted_at", null),
  ]);

  return (
    <CJImportBrowser
      cjDraftCount={cjDraftCount ?? 0}
      cjTotalCount={cjTotalCount ?? 0}
    />
  );
}
