import Link from "next/link";
import { adminListArticles } from "@/lib/editorial/admin-store";
import { StorageNotice } from "@/components/editorial/admin/notice";

export default async function MediaLibraryPage() {
  const list = await adminListArticles();
  const images = list.articles.filter((article) => article.imageUrl);
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-[-0.03em]">Media Library</h1>
      <p className="mt-1 text-sm text-[#667085]">Featured images attached to articles. Uploads are checked before they are stored.</p>
      {list.failed ? <div className="mt-4"><StorageNotice failed={!list.unavailable} /></div> : null}
      {images.length === 0 ? (
        <p className="mt-8 text-sm text-[#667085]">No images yet.</p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((article) => (
            <Link key={article.id} href={`/media/admin/articles/${article.id}`} className="overflow-hidden rounded-2xl border border-[#eceff3] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.imageUrl ?? ""} alt={article.imageAlt || ""} className="aspect-[16/10] w-full object-cover" />
              <p className="px-3 py-3 text-sm font-semibold">{article.title}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
