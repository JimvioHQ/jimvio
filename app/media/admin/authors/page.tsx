import Link from "next/link";
import { adminListArticles } from "@/lib/editorial/admin-store";
import { StorageNotice } from "@/components/editorial/admin/notice";

export default async function MediaAuthorsPage() {
  const list = await adminListArticles();
  const names = new Map<string, number>();
  for (const article of list.articles) {
    const name = article.authorName?.trim();
    if (!name) continue;
    names.set(name, (names.get(name) ?? 0) + 1);
  }
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-[-0.03em]">Author Management</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#667085]">
        Only platform administrators can create or publish Jimvio Media stories. Writer names come from the administrator profile or a name entered on the article. Editorial-team bylines are rejected.
      </p>
      {list.failed ? <div className="mt-4"><StorageNotice failed={!list.unavailable} /></div> : null}
      {names.size === 0 ? (
        <p className="mt-8 text-sm text-[#667085]">No writer names yet.</p>
      ) : (
        <ul className="mt-5 divide-y divide-[#f2f4f7] rounded-2xl border border-[#eceff3] bg-white">
          {[...names.entries()].map(([name, count]) => (
            <li key={name} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-semibold">{name}</span>
              <Link href="/media/admin/articles" className="text-[#667085]">{count} {count === 1 ? "story" : "stories"}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
