import Link from "next/link";
import { adminListArticles } from "@/lib/editorial/admin-store";
import { StorageNotice } from "@/components/editorial/admin/notice";
import { statusClass, statusLabel } from "@/lib/editorial/status";
import { MEDIA_STATUSES } from "@/lib/editorial/types";

export default async function MediaDashboardPage() {
  const list = await adminListArticles();
  const counts = Object.fromEntries(MEDIA_STATUSES.map((status) => [status, list.articles.filter((article) => article.status === status).length]));
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em]">Dashboard</h1>
          <p className="mt-1 text-sm text-[#667085]">Editorial queue for Jimvio Media.</p>
        </div>
        <Link href="/media/admin/articles/new" className="inline-flex h-10 items-center rounded-lg bg-[#fd5000] px-4 text-sm font-semibold text-white">
          + New Article
        </Link>
      </div>
      {list.failed ? <div className="mt-4"><StorageNotice failed={!list.unavailable} /></div> : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {MEDIA_STATUSES.map((status) => (
          <Link key={status} href={`/media/admin/articles?status=${status}`} className="rounded-2xl border border-[#eceff3] bg-white p-4">
            <p className="text-sm font-medium text-[#667085]">{statusLabel(status)}</p>
            <p className="mt-2 text-3xl font-bold">{counts[status] ?? 0}</p>
          </Link>
        ))}
      </div>
      <section className="mt-6 rounded-2xl border border-[#eceff3] bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-bold">Recent articles</h2>
          <Link href="/media/admin/articles" className="text-sm font-semibold text-[#3b5ccc]">View all</Link>
        </div>
        <ul>
          {list.articles.slice(0, 6).map((article) => (
            <li key={article.id} className="flex items-center justify-between gap-3 border-t border-[#f2f4f7] px-4 py-3 text-sm">
              <Link href={`/media/admin/articles/${article.id}`} className="font-semibold text-[#172033]">{article.title}</Link>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(article.status)}`}>{statusLabel(article.status)}</span>
            </li>
          ))}
          {list.articles.length === 0 ? <li className="px-4 py-8 text-sm text-[#667085]">No articles yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
