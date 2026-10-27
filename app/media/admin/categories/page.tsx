import Link from "next/link";
import { adminListArticles } from "@/lib/editorial/admin-store";
import { StorageNotice } from "@/components/editorial/admin/notice";
import { MEDIA_CATEGORIES } from "@/lib/editorial/types";

export default async function MediaCategoriesPage() {
  const list = await adminListArticles();
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-[-0.03em]">Categories</h1>
      <p className="mt-1 text-sm text-[#667085]">These sections match the public Media navigation.</p>
      {list.failed ? <div className="mt-4"><StorageNotice failed={!list.unavailable} /></div> : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {MEDIA_CATEGORIES.map((category) => {
          const count = list.articles.filter((article) => article.category === category.slug).length;
          return (
            <div key={category.slug} className="rounded-2xl border border-[#eceff3] bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">{category.label}</h2>
                <span className="text-sm text-[#667085]">{count}</span>
              </div>
              <div className="mt-3 flex gap-4 text-sm font-semibold">
                <Link href={`/media/category/${category.slug}`} className="text-[#3b5ccc]">Public page</Link>
                <Link href={`/media/admin/articles?q=${category.slug}`} className="text-[#fd5000]">Articles</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
