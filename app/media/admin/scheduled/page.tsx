import { adminListArticles } from "@/lib/editorial/admin-store";
import { ArticleTable } from "@/components/editorial/admin/article-table";
import { StorageNotice } from "@/components/editorial/admin/notice";

export default async function MediaScheduledPage() {
  const list = await adminListArticles();
  const articles = list.articles.filter((article) => article.status === "scheduled");
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-[-0.03em]">Scheduled</h1>
      <p className="mt-1 text-sm text-[#667085]">These stories stay off the public site until their scheduled time.</p>
      {list.failed ? <div className="mt-4"><StorageNotice failed={!list.unavailable} /></div> : null}
      <div className="mt-5">
        <ArticleTable articles={articles} />
      </div>
    </div>
  );
}
