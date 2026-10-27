import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { ArticleView } from "@/components/editorial/article-view";
import { adminGetArticle } from "@/lib/editorial/admin-store";
import { StorageNotice } from "@/components/editorial/admin/notice";
import type { PublicArticle } from "@/lib/editorial/types";
import { isArticleId, publicAuthorName } from "@/lib/editorial/validate";
import { statusLabel } from "@/lib/editorial/status";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

export default async function MediaPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) redirect(auth.status === 401 ? "/login?next=/media/admin" : "/");
  const { id } = await params;
  if (!isArticleId(id)) notFound();
  const loaded = await adminGetArticle(id);
  if (loaded.unavailable) return <div className="mx-auto max-w-3xl px-4 py-10"><StorageNotice /></div>;
  if (!loaded.article) notFound();
  const article = loaded.article;
  const preview: PublicArticle = {
    ...article,
    authorName: publicAuthorName(article.authorName),
    fixture: false,
  };
  return (
    <>
      <p className="border-b border-[#d9e4ff] bg-[#f4f7ff] px-4 py-2 text-center text-[13px] font-medium text-[#24407a]">
        Reader preview · {statusLabel(article.status)}. This page is only visible to administrators.
      </p>
      <ArticleView article={preview} related={[]} />
    </>
  );
}
