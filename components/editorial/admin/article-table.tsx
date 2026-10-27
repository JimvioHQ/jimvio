import Link from "next/link";
import type { AdminArticle } from "@/lib/editorial/types";
import { categoryLabel } from "@/lib/editorial/validate";
import { statusClass, statusLabel } from "@/lib/editorial/status";

export function ArticleTable({ articles }: { articles: AdminArticle[] }) {
  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#e6e8ee] bg-white px-6 py-16 text-center">
        <h2 className="text-lg font-bold text-[#172033]">No articles in this view</h2>
        <p className="mt-2 text-sm text-[#667085]">Create a draft, then publish it when it is ready.</p>
        <Link href="/media/admin/articles/new" className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#fd5000] px-4 text-sm font-semibold text-white">
          + New Article
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#eceff3] bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#fafbfc] text-xs uppercase tracking-wide text-[#667085]">
          <tr>
            <th className="px-4 py-3 font-semibold">Title</th>
            <th className="hidden px-4 py-3 font-semibold md:table-cell">Category</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <tr key={article.id} className="border-t border-[#f2f4f7]">
              <td className="px-4 py-3">
                <Link href={`/media/admin/articles/${article.id}`} className="flex items-center gap-3">
                  {article.imageUrl ? (
                    // Stored editorial images are already validated https or site paths.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={article.imageUrl} alt="" className="h-10 w-14 rounded-md object-cover" />
                  ) : (
                    <span className="h-10 w-14 rounded-md bg-[#f2f4f7]" />
                  )}
                  <span className="font-semibold text-[#172033]">{article.title}</span>
                </Link>
              </td>
              <td className="hidden px-4 py-3 font-medium md:table-cell" style={{ color: "#fd5000" }}>
                {categoryLabel(article.category)}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(article.status)}`}>
                  {statusLabel(article.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/media/admin/articles/${article.id}`} className="font-semibold text-[#3b5ccc]">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
