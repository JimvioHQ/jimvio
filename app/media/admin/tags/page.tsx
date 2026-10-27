import { adminListArticles } from "@/lib/editorial/admin-store";
import { RemoveTagButton } from "@/components/editorial/admin/remove-tag";
import { StorageNotice } from "@/components/editorial/admin/notice";

export default async function MediaTagsPage() {
  const list = await adminListArticles();
  const counts = new Map<string, number>();
  for (const article of list.articles) {
    for (const tag of article.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const tags = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-[-0.03em]">Tags</h1>
      <p className="mt-1 text-sm text-[#667085]">Tags are added on each article. Removing a tag updates every story that uses it.</p>
      {list.failed ? <div className="mt-4"><StorageNotice failed={!list.unavailable} /></div> : null}
      {tags.length === 0 ? (
        <p className="mt-8 text-sm text-[#667085]">No tags yet.</p>
      ) : (
        <ul className="mt-5 divide-y divide-[#f2f4f7] overflow-hidden rounded-2xl border border-[#eceff3] bg-white">
          {tags.map(([tag, count]) => (
            <li key={tag} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-semibold">{tag} <span className="font-medium text-[#667085]">({count})</span></span>
              <RemoveTagButton tag={tag} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
