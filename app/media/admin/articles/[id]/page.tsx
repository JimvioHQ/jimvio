import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/editorial/admin/editor";
import { StorageNotice } from "@/components/editorial/admin/notice";
import { adminArticleAudit, adminGetArticle } from "@/lib/editorial/admin-store";
import { getPlatformAdminSession } from "@/lib/auth/platform-admin-session";
import { isArticleId, publicAuthorName } from "@/lib/editorial/validate";

export default async function EditMediaArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isArticleId(id)) notFound();
  const [loaded, session, audit] = await Promise.all([
    adminGetArticle(id),
    getPlatformAdminSession(),
    adminArticleAudit(id),
  ]);
  if (loaded.unavailable) return <StorageNotice />;
  if (!loaded.article) notFound();
  return (
    <ArticleEditor
      article={loaded.article}
      suggestedAuthor={session.ok ? publicAuthorName(session.user.full_name) : null}
      audit={audit.map((entry) => ({ id: entry.id, action: entry.action, createdAt: entry.createdAt }))}
    />
  );
}
